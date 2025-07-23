import { GoogleGenAI } from "@google/genai";
import { translateText } from "./geminiService";

// --- Helper Functions ---

const handleStabilityAIError = async (response: Response) => {
    const errorText = await response.text();
    console.error("Stability AI Error Response Text:", errorText);
    try {
        const errorBody = JSON.parse(errorText);
        const errorMessage = errorBody.errors ? errorBody.errors.join(', ') : (errorBody.message || `HTTP error: ${response.status}`);
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
    // Check if the prompt contains Arabic characters
    if (/[\u0600-\u06FF]/.test(prompt)) { 
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


// --- Core API Functions ---

export const generateImageWithStabilityAI = async (
    apiKey: string, 
    prompt: string, 
    style: string, 
    aspectRatio: string, 
    model: string = 'core',
    aiClient?: GoogleGenAI | null
): Promise<string> => {
    validateInputs(apiKey, prompt);
    const finalPrompt = await translatePromptIfNeeded(prompt, aiClient);
    
    const isV1Engine = model.includes('stable-diffusion-v1');
    const enhancedPrompt = `A high-quality, ${style.toLowerCase()} image of: ${finalPrompt}`;

    let response: Response;

    if (isV1Engine) {
        // V1 API (e.g., stable-diffusion-v1-6) expects JSON payload
        const apiHost = `https://api.stability.ai/v1/generation/${model}/text-to-image`;
        const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);
        const baseSize = 512; 
        const width = widthRatio >= heightRatio ? baseSize : Math.round(baseSize * (widthRatio / heightRatio));
        const height = heightRatio > widthRatio ? baseSize : Math.round(baseSize * (heightRatio / widthRatio));

        response = await fetch(apiHost, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text_prompts: [{ text: enhancedPrompt, weight: 1 }],
                cfg_scale: 7,
                samples: 1,
                steps: 30,
                width: width,
                height: height,
            }),
        });
    } else {
        // V2 (SD3) API expects FormData payload
        const apiHost = `https://api.stability.ai/v2beta/stable-image/generate/${model === 'core' ? 'core' : 'sd3'}`;
        const formData = new FormData();
        formData.append('prompt', enhancedPrompt);
        formData.append('output_format', 'jpeg');
        formData.append('aspect_ratio', aspectRatio);
        if (model === 'ultra') {
            formData.append('model', 'sd3-ultra');
        }

        response = await fetch(apiHost, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/json',
            },
            body: formData,
        });
    }

    if (!response.ok) {
        await handleStabilityAIError(response);
    }

    const responseJSON = await response.json();

    if (responseJSON.artifacts && responseJSON.artifacts.length > 0) {
        // V1 response
        return responseJSON.artifacts[0].base64;
    }
    if (responseJSON.image) {
        // V2 response
        return responseJSON.image;
    }
    
    if (responseJSON.finish_reason === 'CONTENT_FILTERED') {
        throw new Error("Stability AI error: The prompt was rejected for safety reasons. Please try changing the image description.");
    }

    throw new Error(`Image generation failed. Stability AI reason: ${responseJSON.finish_reason || 'Unknown error, check response format.'}`);
};


export const upscaleImageWithStabilityAI = async (
    apiKey: string,
    imageFile: File,
    prompt: string,
): Promise<string> => {
     if (!apiKey.trim()) throw new Error("Stability AI API key is not provided.");
     if (!imageFile) throw new Error("Please provide an image to upscale.");

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('prompt', prompt);

    const response = await fetch(`https://api.stability.ai/v2beta/stable-image/upscale/creative`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
        },
        body: formData,
    });

    if (!response.ok) await handleStabilityAIError(response);
    
    const responseJSON = await response.json();
    
    if (responseJSON.image) return responseJSON.image;

    throw new Error(`Image upscaling failed. Stability AI reason: ${responseJSON.finish_reason || 'Unknown error'}`);
};


export const imageToImageWithStabilityAI = async (
    apiKey: string,
    imageFile: File,
    prompt: string,
    model: string = 'stable-diffusion-v1-6',
    strength: number = 0.6,
): Promise<string> => {
    validateInputs(apiKey, prompt);

    const formData = new FormData();
    formData.append('init_image', imageFile);
    formData.append('text_prompts[0][text]', prompt);
    formData.append('text_prompts[0][weight]', '1');
    formData.append('image_strength', strength.toString());
    formData.append('steps', '30');
    formData.append('cfg_scale', '7');
    formData.append('samples', '1');

    // This service primarily uses v1 engines
    const apiHost = `https://api.stability.ai/v1/generation/${model}/image-to-image`;

    const response = await fetch(apiHost, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
        },
        body: formData,
    });

    if (!response.ok) await handleStabilityAIError(response);

    const responseJSON = await response.json();

    if (responseJSON.artifacts && responseJSON.artifacts.length > 0) {
        return responseJSON.artifacts[0].base64;
    }
    throw new Error(`Image-to-image generation failed. No artifacts returned.`);
};

export const inpaintingWithStabilityAI = async (
    apiKey: string,
    imageFile: File,
    maskFile: File, // A black and white image where white indicates the area to change
    prompt: string,
    model: string = 'stable-diffusion-v1-6',
): Promise<string> => {
    validateInputs(apiKey, prompt);

    const formData = new FormData();
    formData.append('init_image', imageFile);
    formData.append('mask_image', maskFile);
    formData.append('mask_source', 'MASK_IMAGE_WHITE');
    formData.append('text_prompts[0][text]', prompt);
    formData.append('text_prompts[0][weight]', '1');
    formData.append('cfg_scale', '7');
    formData.append('samples', '1');
    formData.append('steps', '30');

    // This service uses v1 engines
    const apiHost = `https://api.stability.ai/v1/generation/${model}/image-to-image/masking`;

    const response = await fetch(apiHost, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
        },
        body: formData,
    });

    if (!response.ok) await handleStabilityAIError(response);

    const responseJSON = await response.json();

    if (responseJSON.artifacts && responseJSON.artifacts.length > 0) {
        return responseJSON.artifacts[0].base64;
    }
    throw new Error(`Inpainting failed. No artifacts returned.`);
};

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
        console.log("Stability AI Models API Response:", data); // Log the full response
        // Filter for relevant image generation models
        return data.filter((engine: any) => engine.type === 'PICTURE');
    } catch (error) {
        console.error("Error fetching Stability AI models:", error);
        return [];
    }
        
};