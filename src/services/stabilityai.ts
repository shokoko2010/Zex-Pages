
import { GoogleGenAI } from "@google/genai";
import { translateText } from "./geminiService";

const STABILITY_API_BASE_URL = 'https://api.stability.ai';

const getApiHost = (model: string) => {
    // Note: Use "platform.stability.ai" for all models other than Stable Diffusion v1.5
    // The model names are case-sensitive
    if (model === "stable-diffusion-v1-5") {
        return "https://api.stability.ai/v1/generation/stable-diffusion-v1-5";
    }
    return `https://api.stability.ai/v2beta/stable-image/generate/${model}`;
};

const handleStabilityAIError = async (response: Response) => {
    const errorText = await response.text();
    console.error("Stability AI Error Response Text:", errorText);
    try {
        const errorBody = JSON.parse(errorText);
        const errorMessage = errorBody.errors ? errorBody.errors.join(', ') : `HTTP error: ${response.status}`;
        throw new Error(`Stability AI error: ${errorMessage}`);
    } catch (e) {
         throw new Error(`Stability AI error: ${response.statusText} (${response.status})`);
    }
};

const validateInputs = (apiKey: string, prompt: string) => {
    if (!apiKey.trim()) {
        throw new Error("Stability AI API key is not provided. Please add it in the settings.");
    }
    if (!prompt.trim()) {
        throw new Error("Please enter a description to generate the image.");
    }
};

const translatePromptIfNeeded = async (prompt: string, aiClient?: GoogleGenAI | null): Promise<string> => {
    if (/[\u0600-\u06FF]/.test(prompt)) { // Check if the prompt contains Arabic characters
        if (!aiClient) {
            throw new Error("Automatic translation requires a Gemini API key. Please add it in the settings to proceed.");
        }
        try {
            return await translateText(aiClient, prompt, 'en');
        } catch(e) {
            throw new Error(`Translation failed before sending to Stability AI: ${(e as Error).message}`);
        }
    }
    return prompt;
};


export const generateImageWithStabilityAI = async (
    apiKey: string, 
    prompt: string, 
    style: string, 
    aspectRatio: string, 
    model: string = 'core', // 'core' is the default for Stable Diffusion 3
    aiClient?: GoogleGenAI | null
): Promise<string> => {
    validateInputs(apiKey, prompt);
    const finalPrompt = await translatePromptIfNeeded(prompt, aiClient);
    const enhancedPrompt = `A high-quality, ${style.toLowerCase()} image of: ${finalPrompt}`;

    const formData = new FormData();
    formData.append('prompt', enhancedPrompt);
    formData.append('output_format', 'jpeg');
    formData.append('aspect_ratio', aspectRatio);
    formData.append('model', model); // Pass the model to the API if the endpoint supports it

    const apiHost = getApiHost(model);

    const response = await fetch(apiHost, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
        },
        body: formData,
    });

    if (!response.ok) {
        await handleStabilityAIError(response);
    }

    const responseJSON = await response.json();

    if (responseJSON.image && responseJSON.finish_reason === 'SUCCESS') {
      return responseJSON.image; // Return the base64 image data directly
    }
    if (responseJSON.finish_reason === 'CONTENT_FILTERED') {
        throw new Error("Stability AI error: The prompt was rejected for safety reasons. Please try changing the image description.");
    }
    throw new Error(`Image generation failed. Stability AI reason: ${responseJSON.finish_reason}`);
};

export const upscaleImageWithStabilityAI = async (
    apiKey: string,
    imageFile: File,
    prompt: string, // Can be a creative prompt or a simple instruction like "upscale"
): Promise<string> => {
     if (!apiKey.trim()) {
        throw new Error("Stability AI API key is not provided. Please add it in the settings.");
    }
    if (!imageFile) {
        throw new Error("Please provide an image to upscale.");
    }

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('prompt', prompt);

    const response = await fetch(`${STABILITY_API_BASE_URL}/v2beta/stable-image/upscale/creative`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
        },
        body: formData,
    });

    if (!response.ok) {
        await handleStabilityAIError(response);
    }
    
    const responseJSON = await response.json();
    
    if (responseJSON.image && responseJSON.finish_reason === 'SUCCESS') {
        return responseJSON.image; // Return the base64 image data directly
    }
    throw new Error(`Image upscaling failed. Stability AI reason: ${responseJSON.finish_reason}`);
};

export const imageToImageWithStabilityAI = async (
    apiKey: string,
    imageFile: File,
    prompt: string,
    model: string = 'stable-diffusion-v1-5', // Default to a common model
    strength: number = 0.6, // Strength of the original image
): Promise<string> => {
    validateInputs(apiKey, prompt);

    const formData = new FormData();
    formData.append('init_image', imageFile);
    formData.append('text_prompts[0][text]', prompt);
    formData.append('text_prompts[0][weight]', '1');
    formData.append('image_strength', strength.toString());
    formData.append('steps', '30'); // Number of diffusion steps
    formData.append('cfg_scale', '7'); // How strongly the prompt is adhered to
    formData.append('samples', '1');

    const apiHost = getApiHost(model).replace('/generation/', '/image-to-image/'); // Adjust host for image-to-image

    const response = await fetch(apiHost, {
        method: 'POST',
        headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
        },
        body: formData,
    });

    if (!response.ok) {
        await handleStabilityAIError(response);
    }

    const responseJSON = await response.json();

    if (responseJSON.artifacts && responseJSON.artifacts.length > 0) {
        return responseJSON.artifacts[0].base64;
    }
    throw new Error(`Image-to-image generation failed. No artifacts returned.`);
};

export const inpaintingWithStabilityAI = async (
    apiKey: string,
    imageFile: File,
    maskFile: File,
    prompt: string,
    model: string = 'stable-diffusion-v1-5',
): Promise<string> => {
    validateInputs(apiKey, prompt);

    const formData = new FormData();
    formData.append('init_image', imageFile);
    formData.append('mask_image', maskFile);
    formData.append('mask_source', 'MASK_IMAGE_WHITE'); // Can be WHITE or BLACK
    formData.append('text_prompts[0][text]', prompt);
    formData.append('steps', '30');
    formData.append('cfg_scale', '7');
    formData.append('samples', '1');

    const apiHost = getApiHost(model).replace('/generation/', '/in-painting/'); // Adjust host for inpainting

    const response = await fetch(apiHost, {
        method: 'POST',
        headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
        },
        body: formData,
    });
    
    if (!response.ok) {
        await handleStabilityAIError(response);
    }
    
    const responseJSON = await response.json();
    
    if (responseJSON.artifacts && responseJSON.artifacts.length > 0) {
        return responseJSON.artifacts[0].base64;
    }
    throw new Error(`Inpainting failed. No artifacts returned.`);
}

export const getStabilityAIModels = async (apiKey: string) => {
    if (!apiKey) return [];
    try {
        const response = await fetch('https://api.stability.ai/v1/engines/list', {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });
        if (!response.ok) {
            console.error("Failed to fetch Stability AI models:", response.statusText);
            return [];
        }
        const data = await response.json();
        // Filter for relevant image generation models
        return data.filter((engine: any) => engine.type === 'PICTURE' && engine.id.includes('stable-diffusion'));
    } catch (error) {
        console.error("Error fetching Stability AI models:", error);
        return [];
    }
};

