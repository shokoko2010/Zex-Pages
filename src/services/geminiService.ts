
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { StrategyRequest, ContentPlanItem, PostAnalytics, PageProfile, PerformanceSummaryData, PublishedPost, HeatmapDataPoint, ContentTypePerformanceData } from "../types";

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

const cleanAndParseJson = (rawText: string) => {
    let jsonStr = rawText.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    try {
        return JSON.parse(jsonStr);
    } catch (parseError) {
        console.error("JSON parsing error:", parseError, "\nRaw text received:", rawText);
        throw new Error("فشل تحليل استجابة الذكاء الاصطناعي (تنسيق JSON غير صالح).");
    }
};

const handleGeminiError = (error: any, context: string): Error => {
    console.error(`Error in ${context}:`, error);
    if (error?.constructor?.name === 'ApiError') {
        if (error?.status === 429 || error?.message?.includes('RESOURCE_EXHAUSTED')) {
            return new Error("لقد تجاوزت حصتك اليومية المجانية من استخدام واجهة Gemini API. يرجى المحاولة مرة أخرى غدًا أو الترقية.");
        }
        if (error?.message?.includes('Imagen API is only accessible to billed users')) {
            return new Error('واجهة برمجة تطبيقات Imagen متاحة فقط للمستخدمين الذين لديهم فواتير نشطة. يرجى التحقق من إعدادات الفوترة في حساب Google Cloud الخاص بك.');
        }
    }
    if (error instanceof Error) {
        return new Error(`حدث خطأ أثناء ${context}: ${error.message}`);
    }
    return new Error(`حدث خطأ غير متوقع أثناء ${context}.`);
};


const createPageContext = (pageProfile?: PageProfile): string => {
  if (!pageProfile || Object.values(pageProfile).every(val => !val)) {
    return '';
  }

  let languageInstruction = '';
  if (pageProfile.contentGenerationLanguages && pageProfile.contentGenerationLanguages.length > 0) {
      const languages = pageProfile.contentGenerationLanguages.map(lang => {
          if (lang === 'ar') return 'العربية';
          if (lang === 'en') return 'English';
          return '';
      }).filter(Boolean).join(' و ');

      languageInstruction = `مهم: يجب أن يكون كل المحتوى الذي تنشئه باللغة (أو اللغات) التالية: ${languages}. إذا تم تحديد لغتين، قم بتوفير المحتوى بكلتا اللغتين إن أمكن (مثال: منشور مزدوج اللغة).`;
  }
  
  const pageLangText = pageProfile.language === 'ar' ? 'العربية' : pageProfile.language === 'en' ? 'English' : 'مختلطة (عربي/إنجليزي)';

  const additionalLinksText = (pageProfile.links && pageProfile.links.length > 0)
    ? `\n- روابط إضافية:\n${pageProfile.links.filter(l => l.label && l.url).map(link => `  - ${link.label}: ${link.url}`).join('\n')}`
    : '';

  return `
    ---
    سياق الصفحة/العمل (استخدم هذه المعلومات في ردك):
    - وصف العمل: ${pageProfile.description || 'غير محدد'}
    - المنتجات/الخدمات: ${pageProfile.services || 'غير محدد'}
    - العنوان: ${pageProfile.address || 'غير محدد'}
    - البلد: ${pageProfile.country || 'غير محدد'}
    - معلومات الاتصال (الهاتف/واتساب): ${pageProfile.contactInfo || 'غير محدد'}
    - الموقع الإلكتروني الرئيسي: ${pageProfile.website || 'غير محدد'}${additionalLinksText}
    - العروض الحالية: ${pageProfile.currentOffers || 'غير محدد'}
    - لغة الصفحة الأساسية للجمهور: ${pageLangText}
    ${languageInstruction ? `- ${languageInstruction}` : ''}
    ---
  `;
};

export const enhanceProfileFromFacebookData = async (
  ai: GoogleGenAI,
  facebookData: { about?: string; category?: string; contact?: string; website?: string; address?: string, country?: string }
): Promise<PageProfile> => {
  const prompt = `
    أنت خبير في الهوية التجارية والتسويق الرقمي. مهمتك هي أخذ البيانات الأولية لصفحة فيسبوك وتحويلها إلى ملف تعريف احترافي وجذاب.
    
    البيانات الأولية من فيسبوك:
    - الوصف (About): "${facebookData.about || 'غير متوفر'}"
    - الفئة (Category): "${facebookData.category || 'غير متوفر'}"
    - معلومات الاتصال: "${facebookData.contact || 'غير متوفر'}"
    - الموقع الإلكتروني: "${facebookData.website || 'غير متوفر'}"
    - العنوان: "${facebookData.address || 'غير متوفر'}"
    - البلد: "${facebookData.country || 'غير متوفر'}"

    المطلوب:
    قم بإنشاء كائن JSON فقط، بدون أي نص إضافي أو علامات markdown، يحتوي على المفاتيح التالية بالقيم المحسنة:
    1. "description": (string) أعد كتابة الوصف ليكون أكثر جاذبية وتسويقية. اجعله موجزًا ويركز على القيمة المقدمة للعميل.
    2. "services": (string) من خلال الوصف والفئة، استنتج قائمة بالمنتجات أو الخدمات الرئيسية التي يقدمها العمل. افصل بينها بفاصلة.
    3. "contactInfo": (string) قم بتنظيم معلومات الاتصال التي تم استردادها في سلسلة نصية واضحة.
    4. "website": (string) استخدم رابط الموقع كما هو.
    5. "address": (string) استخدم العنوان كما هو.
    6. "country": (string) استخدم البلد كما هو.
    7. "currentOffers": (string) اترك هذا الحقل فارغًا ("").

    إذا كانت إحدى المعلومات غير متوفرة في البيانات الأولية، فاترك الحقل المقابل لها فارغًا في الـ JSON. لا تخمن أي معلومات.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
         responseMimeType: "application/json",
         responseSchema: {
            type: Type.OBJECT,
            properties: {
                description: { type: Type.STRING },
                services: { type: Type.STRING },
                contactInfo: { type: Type.STRING },
                website: { type: Type.STRING },
                address: { type: Type.STRING },
                country: { type: Type.STRING },
                currentOffers: { type: Type.STRING }
            }
         }
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("لم يتمكن الذكاء الاصطناعي من تحسين الملف الشخصي (استجابة فارغة).");
    }
    
    const enhancedProfile = cleanAndParseJson(text);
    if (enhancedProfile && typeof enhancedProfile.description === 'string') {
        return enhancedProfile as PageProfile;
    }
    throw new Error("فشل الذكاء الاصطناعي في إنشاء ملف شخصي بالتنسيق المطلوب.");
    
  } catch (error: any) {
    throw handleGeminiError(error, "تحسين بيانات الصفحة");
  }
};

export const initializeGoogleGenAI = (apiKey: string): GoogleGenAI | null => {
  if (!apiKey) {
    console.warn("Gemini API key is not provided. Client not initialized.");
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
    return null;
  }
};

export const generatePostSuggestion = async (ai: GoogleGenAI, topic: string, pageProfile?: PageProfile): Promise<string> => {
  try {
    const pageContext = createPageContext(pageProfile);
    const prompt = `
    ${pageContext}
    أنت خبير في التسويق عبر وسائل التواصل الاجتماعي.
    مهمتك هي كتابة منشور جذاب لصفحة فيسبوك حول الموضوع التالي: "${topic}".
    يجب أن يكون المنشور:
    - متوافقًا مع سياق الصفحة والعمل الموضح أعلاه.
    - ودود ومحفز للنقاش.
    - يحتوي على سؤال أو دعوة للتفاعل (call to action).
    - يستخدم بعض الإيموجي المناسبة بشكل طبيعي.
    - لا تضع عنوانًا للمنشور، ابدأ مباشرة بالمحتوى.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text ?? '';
  } catch (error: any) {
    throw handleGeminiError(error, "إنشاء اقتراح منشور");
  }
};

export const generateHashtags = async (ai: GoogleGenAI, postText: string, pageProfile?: PageProfile, imageFile?: File): Promise<string[]> => {
  try {
    const pageContext = createPageContext(pageProfile);
    const contentParts: any[] = [];

    if (imageFile) {
        const imagePart = await fileToGenerativePart(imageFile);
        contentParts.push(imagePart);
    }
    
    const textPrompt = `
      ${pageContext}
      أنت خبير في التسويق عبر وسائل التواصل الاجتماعي. بناءً على النص والصورة المرفقة (إن وجدت)، قم بإنشاء قائمة من الهاشتاجات الفعالة لمنشور على فيسبوك وانستغرام.
      
      النص: "${postText}"
      
      المطلوب:
      - قائمة من 10-15 هاشتاج.
      - نوّع بين الهاشتاجات العامة، المتخصصة (niche)، والمتعلقة بالعلامة التجارية (استنبطها من سياق الصفحة).
      - أرجع الرد بتنسيق JSON فقط، على شكل مصفوفة من السلاسل النصية التي تبدأ بعلامة #.
      - مثال: ["#تسويق_رقمي", "#marketing_tips", "#اسم_العلامة_التجارية"]
    `;
    contentParts.push({ text: textPrompt });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: contentParts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("لم يتمكن الذكاء الاصطناعي من اقتراح هاشتاجات (استجابة فارغة).");
    
    const hashtags = cleanAndParseJson(text);
    if (Array.isArray(hashtags) && hashtags.length > 0) {
      return hashtags;
    }
    throw new Error("فشل الذكاء الاصطناعي في إنشاء هاشتاجات بالتنسيق المطلوب.");

  } catch (error: any) {
    throw handleGeminiError(error, "إنشاء هاشتاجات");
  }
};

export const generateImageFromPrompt = async (ai: GoogleGenAI, prompt: string, style: string, aspectRatio: string, model: string = 'imagen-3.0-generate-002'): Promise<string> => {
  if (!prompt.trim()) {
    throw new Error("يرجى إدخال وصف لإنشاء الصورة.");
  }
  try {
    const enhancedPrompt = `A high-quality, ${style.toLowerCase()} image of: ${prompt}`;
    const response = await ai.models.generateImages({
      model: model,
      prompt: enhancedPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio,
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image && response.generatedImages[0].image.imageBytes) {
      return response.generatedImages[0].image.imageBytes;
    } else {
      console.error("Image generation failed, API did not return an image.", response);
      throw new Error("فشل إنشاء الصورة. قد يكون السبب هو حظر المحتوى لأسباب تتعلق بالسلامة أو مشكلة أخرى في الاستجابة.");
    }
  } catch (error: any) {
    throw handleGeminiError(error, "إنشاء صورة");
  }
};



export const translateText = async (ai: GoogleGenAI, text: string, targetLang: string = 'en'): Promise<string> => {
    const prompt = `Translate the following text to ${targetLang}:\n\n"${text}"\n\nReturn only the translated text, with no extra formatting or explanations.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        const translatedText = response.text;
        if (!translatedText) {
          throw new Error('فشل الترجمة (استجابة فارغة).');
        }
        return translatedText.trim();
    } catch(error) {
        throw handleGeminiError(error, `الترجمة إلى ${targetLang}`);
    }
}

export const getBestPostingTime = async (ai: GoogleGenAI, postText: string): Promise<Date> => {
  if (!postText.trim()) {
    throw new Error("يرجى كتابة منشور أولاً لاقتراح أفضل وقت.");
  }
  try {
    const prompt = `
      بصفتك خبيرًا في وسائل التواصل الاجتماعي، قم بتحليل نص منشور فيسبوك التالي واقترح أفضل وقت في المستقبل لنشره لتحقيق أقصى قدر من التفاعل.
      الوقت الحالي هو: ${new Date().toISOString()}. يجب أن يكون الوقت المقترح بعد ساعة واحدة على الأقل من الوقت الحالي وفي غضون الأسبوع القادم.

      نص المنشور:
      "${postText}"

      أرجع الرد بتنسيق JSON فقط، بدون أي نص إضافي أو علامات markdown. يجب أن يحتوي كائن JSON على مفتاح واحد فقط "suggested_time_iso" بقيمة سلسلة زمنية بتنسيق ISO 8601.
      مثال: {"suggested_time_iso": "2024-08-25T17:00:00.000Z"}
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                suggested_time_iso: { type: Type.STRING }
            }
        }
      },
    });

    const text = response.text;
    if (!text) {
        throw new Error("لم يتمكن الذكاء الاصطناعي من اقتراح وقت صالح (استجابة فارغة).");
    }

    const data = cleanAndParseJson(text);

    if (data && data.suggested_time_iso) {
      const suggestedDate = new Date(data.suggested_time_iso);
      if (suggestedDate.getTime() > Date.now()) {
        return suggestedDate;
      }
    }
    throw new Error("لم يتمكن الذكاء الاصطناعي من اقتراح وقت صالح.");

  } catch (error: any) {
    throw handleGeminiError(error, "اقتراح وقت النشر");
  }
};

export const generateDescriptionForImage = async (ai: GoogleGenAI, imageFile: File, pageProfile?: PageProfile): Promise<string> => {
  try {
    const imagePart = await fileToGenerativePart(imageFile);
    const pageContext = createPageContext(pageProfile);
    const textPart = {
      text: `
      ${pageContext}
      أنت خبير في التسويق عبر وسائل التواصل الاجتماعي ومتخصص في كتابة الإعلانات (Copywriter).
      مهمتك هي كتابة وصف جذاب ومقنع كمنشور لفيسبوك بناءً على الصورة المرفقة وسياق الصفحة/العمل المقدم.
      
      يجب أن يكون الوصف:
      - متوافقًا تمامًا مع هوية العلامة التجارية الموضحة في سياق الصفحة.
      - محفزًا للتفاعل، ويجب أن ينتهي دائمًا بسؤال أو دعوة واضحة للعمل (Call to Action).
      
      **الأهم:** في دعوة العمل (CTA)، قم بدمج معلومات الاتصال أو العنوان أو الموقع الإلكتروني من "سياق الصفحة" بشكل طبيعي. 
      مثال: "للطلب والاستفسار، تواصلوا معنا على [رقم الهاتف] أو زوروا موقعنا [رابط الموقع]." أو "تفضلوا بزيارتنا في فرعنا بـ [العنوان] لتجربة فريدة!".
      
      - استخدم 2-3 إيموجي مناسبة لإضافة لمسة حيوية.
      - لا يزيد عن 4-5 أسطر.
      - ابدأ مباشرة بالوصف، لا تضع عنوانًا مثل "وصف مقترح:".
      `,
    };
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
    });
    
    return response.text ?? '';
  } catch (error: any) {
    throw handleGeminiError(error, "إنشاء وصف للصورة");
  }
};


export const generateContentPlan = async (ai: GoogleGenAI, request: StrategyRequest, pageProfile?: PageProfile, images?: File[]): Promise<ContentPlanItem[]> => {
  try {
    const pageContext = createPageContext(pageProfile);
    const countryContext = pageProfile?.country ? `أنت تكتب لجمهور في ${pageProfile.country}. استخدم اللهجة المحلية المتحضرة وأسلوب التواصل المناسب لهذا البلد.` : '';
    let contentParts: any[] = [];
    
    let durationText: string;
    let postCountText: string;
    let strategyDetailsPrompt: string;

    switch(request.duration) {
      case 'weekly': durationText = 'أسبوع واحد (7 أيام)'; postCountText = '7 أفكار منشورات فريدة'; break;
      case 'monthly': durationText = 'شهر واحد (4 أسابيع)'; postCountText = `${request.postCount || 12} فكرة منشور فريدة`; break;
      case 'annual': durationText = 'سنة كاملة (12 شهرًا)'; postCountText = '12 فكرة منشور فريدة (واحدة لكل شهر)'; break;
    }

    switch(request.type) {
      case 'standard':
        strategyDetailsPrompt = `- نوع الاستراتيجية: خطة محتوى قياسية.\n- أعمدة المحتوى (Content Pillars) للتركيز عليها: ${request.pillars || 'متنوعة وشاملة'}.`;
        break;
      case 'campaign':
        strategyDetailsPrompt = `- نوع الاستراتيجية: حملة تسويقية.\n- اسم الحملة: ${request.campaignName || 'غير محدد'}\n- هدف الحملة: ${request.campaignObjective || 'غير محدد'}`;
        break;
      case 'occasion':
        strategyDetailsPrompt = `- نوع الاستراتيجية: حملة مبنية على مناسبة.\n- المناسبة: "${request.occasion}"\n- المطلوب: قم بإنشاء حملة تسويقية قصيرة ومتكاملة (3-5 أيام) حول هذه المناسبة.`;
        durationText = `حملة لـ ${request.occasion}`;
        postCountText = '4 أفكار منشورات فريدة';
        break;
      case 'pillar':
        strategyDetailsPrompt = `- نوع الاستراتيجية: المحتوى المحوري (Pillar Content).\n- الموضوع المحوري الرئيسي: "${request.pillarTopic}"\n- المطلوب: قم بإنشاء فكرة منشور محوري واحد (طويل ومفصل)، ثم أنشئ 5-6 أفكار منشورات عنقودية (أصغر ومترابطة) تدعم الموضوع الرئيسي.`;
        durationText = `محتوى محوري عن ${request.pillarTopic}`;
        postCountText = '7 أفكار منشورات فريدة';
        break;
      case 'images':
        if (images && images.length > 0) {
          strategyDetailsPrompt = `- نوع الاستراتيجية: مبنية على الصور المرفقة (${images.length} صور). لكل صورة، اقترح فكرة منشور فريدة ومناسبة.`;
          const imageParts = await Promise.all(images.map(fileToGenerativePart));
          contentParts.push(...imageParts);
          postCountText = `${images.length} فكرة منشور فريدة`;
        } else {
          throw new Error("يجب توفير صور لاستراتيجية المحتوى المبنية على الصور.");
        }
        break;
    }
    
    const mainPrompt = `${pageContext}\n
      أنت خبير استراتيجي محترف في إنشاء المحتوى. مهمتك هي إنشاء خطة محتوى إبداعية ومتنوعة بناءً على الطلب التالي.
      ${countryContext}

      تفاصيل الطلب:
      ${strategyDetailsPrompt}
      - مدة الخطة: ${durationText}.
      - الجمهور المستهدف: ${request.audience}
      - الأهداف: ${request.goals}
      - النبرة المطلوبة: ${request.tone}

      المطلوب:
      أنشئ خطة محتوى تحتوي على ${postCountText}. لكل فكرة منشور، قم بإنشاء كائن JSON بالهيكل التالي:
      1.  "day": (string) اليوم أو الفترة الزمنية للفكرة (مثال: "الأسبوع 1 - اليوم 1" أو "يناير").
      2.  "hook": (string) خطاف نصي: جملة واحدة قصيرة ومثيرة للاهتمام لجذب انتباه القارئ في أول ثانية.
      3.  "headline": (string) عنوان جذاب: عنوان رئيسي واضح وجذاب للمنشور يلخص الفكرة الرئيسية.
      4.  "body": (string) النص التسويقي: النص الكامل للمنشور. **مهم جداً:** يجب أن يتضمن هذا النص بشكل طبيعي معلومات الاتصال من سياق الصفحة (الهاتف، العنوان، واتساب إن وجد، والموقع الإلكتروني) وأن ينتهي بمجموعة من 3 إلى 5 هاشتاجات مناسبة وفعالة.
      5.  "imageIdea": (string) فكرة التصميم: وصف مفصل ومبدع لمصمم جرافيك لإنشاء صورة المنشور. يجب أن يصف العناصر المرئية، الألوان، الأجواء العامة، وأي نص مقترح لوضعه على الصورة.

      تأكد من أن الرد هو مصفوفة JSON صالحة تحتوي على الكائنات المطلوبة فقط.
    `;
    
    contentParts.push({ text: mainPrompt });

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                day: { type: Type.STRING, description: "اليوم أو الفترة الزمنية للفكرة" },
                hook: { type: Type.STRING, description: "خطاف نصي: جملة واحدة قصيرة ومثيرة للاهتمام لجذب الانتباه." },
                headline: { type: Type.STRING, description: "عنوان جذاب: عنوان رئيسي للمنشور." },
                body: { type: Type.STRING, description: "النص التسويقي: النص الكامل للمنشور. يجب أن يتضمن هذا النص بشكل طبيعي معلومات الاتصال من سياق الصفحة (الهاتف، العنوان، واتساب، الموقع) وينتهي بعدة هاشتاجات مناسبة." },
                imageIdea: { type: Type.STRING, description: "فكرة التصميم: وصف مفصل لمصمم جرافيك لإنشاء صورة المنشور، بما في ذلك العناصر المرئية والنص المقترح على الصورة." },
            },
            required: ['day', 'hook', 'headline', 'body', 'imageIdea']
        }
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: contentParts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema
      },
    });
    
    const text = response.text;
    if (!text) throw new Error("لم يتمكن الذكاء الاصطناعي من إنشاء خطة (استجابة فارغة).");

    const plan = cleanAndParseJson(text);
    if (Array.isArray(plan) && plan.length > 0 && plan[0].day && plan[0].hook) {
      return plan;
    }
    throw new Error("فشل الذكاء الاصطناعي في إنشاء خطة بالتنسيق المطلوب.");

  } catch (error: any) {
    throw handleGeminiError(error, "إنشاء خطة المحتوى");
  }
};


export const generateOptimalSchedule = async (ai: GoogleGenAI, plan: ContentPlanItem[]): Promise<{ postSuggestion: string, scheduledAt: string }[]> => {
  const planText = plan.map((item, i) => `${i + 1}. ${item.headline}`).join('\n');
  const prompt = `
    أنت خبير استراتيجي لجدولة المحتوى. مهمتك هي أخذ قائمة من عناوين منشورات المحتوى واقتراح أفضل تاريخ ووقت لنشر كل منها خلال الشهر القادم.
    تاريخ اليوم هو: ${new Date().toISOString()}. يجب أن تكون جميع الأوقات المقترحة في المستقبل. وزّع المنشورات بذكاء.
    قائمة عناوين المنشورات:
    ${planText}

    يجب أن يكون الرد مصفوفة JSON. كل عنصر في المصفوفة يجب أن يكون كائنًا يحتوي على مفتاحين: "postSuggestion" (استخدم عنوان المنشور كما هو من القائمة) و "scheduledAt" (سلسلة نصية للتاريخ بتنسيق ISO 8601).
  `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            postSuggestion: { type: Type.STRING },
                            scheduledAt: { type: Type.STRING }
                        }
                    }
                }
            },
        });
        const text = response.text;
        if (!text) throw new Error("لم يتمكن الذكاء الاصطناعي من إنشاء جدول زمني (استجابة فارغة).");
        
        const schedule = cleanAndParseJson(text);
        if (Array.isArray(schedule) && schedule.length > 0 && schedule[0].scheduledAt) {
            // Match the suggestions back to the original full plan items
            return plan.map((originalItem, index) => ({
                postSuggestion: originalItem.body, // Use the full body for the new post
                scheduledAt: schedule[index]?.scheduledAt || new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString() // Fallback schedule
            }));
        }
        throw new Error("فشل الذكاء الاصطناعي في إنشاء جدول زمني بالتنسيق المطلوب.");
    } catch (error: any) {
        throw handleGeminiError(error, "إنشاء الجدول الزمني الأمثل");
    }
};


export const generatePostInsights = async (
  ai: GoogleGenAI, 
  postText: string, 
  analytics: PostAnalytics, 
  comments: {message: string}[]
): Promise<{ performanceSummary: string, sentiment: { positive: number, negative: number, neutral: number } }> => {
  try {
    const commentsSample = comments.map(c => c.message).join('\n- ');
    const prompt = `
      أنت خبير تحليل وسائل التواصل الاجتماعي. حلل أداء منشور فيسبوك وتعليقاته وقدم رؤى.
      - النص: "${postText || '(صورة فقط)'}"
      - إعجابات: ${analytics.likes ?? 0}, تعليقات: ${analytics.comments ?? 0}, مشاركات: ${analytics.shares ?? 0}
      - عينة التعليقات: - ${commentsSample}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                performanceSummary: { type: Type.STRING },
                sentiment: {
                    type: Type.OBJECT,
                    properties: {
                        positive: { type: Type.NUMBER },
                        negative: { type: Type.NUMBER },
                        neutral: { type: Type.NUMBER }
                    }
                }
            }
        }
      },
    });
    
    const text = response.text;
    if (!text) throw new Error("لم يتمكن الذكاء الاصطناعي من إنشاء التحليل (استجابة فارغة).");
    
    const data = cleanAndParseJson(text);
    if (data && data.performanceSummary && data.sentiment) {
      return data;
    }
    throw new Error("فشل الذكاء الاصطناعي في إنشاء التحليل بالتنسيق المطلوب.");
  } catch (error: any) {
    throw handleGeminiError(error, "إنشاء تحليل المنشور");
  }
};

export const generatePerformanceSummary = async (
  ai: GoogleGenAI,
  summaryData: PerformanceSummaryData,
  pageProfile: PageProfile,
  period: '7d' | '30d'
): Promise<string> => {
    const pageContext = createPageContext(pageProfile);
    const topPostsText = summaryData.topPosts.map((p, i) => `${i+1}. "${p.text.substring(0, 50)}..." (تفاعل: ${(p.analytics.likes ?? 0) + (p.analytics.comments ?? 0) + (p.analytics.shares ?? 0)})`).join('\n');
    const periodText = period === '7d' ? 'الـ 7 أيام الماضية' : 'الـ 30 يومًا الماضية';

    const prompt = `
    ${pageContext}
    أنت محلل بيانات تسويقية. حلل الأداء العام لصفحة وقدم ملخصًا تنفيذيًا.
    بيانات الأداء لفترة ${periodText}:
    - الوصول: ${summaryData.totalReach}, التفاعل: ${summaryData.totalEngagement}, معدل التفاعل: ${(summaryData.engagementRate * 100).toFixed(2)}%, عدد المنشورات: ${summaryData.postCount}
    - أفضل المنشورات:
    ${topPostsText}
    اكتب فقرة واحدة (2-4 جمل) تلخص هذا الأداء، مع شرح السبب وتوصية استراتيجية.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text ?? 'لم يتمكن الذكاء الاصطناعي من إنشاء الملخص.';
    } catch(error: any) {
        throw handleGeminiError(error, "إنشاء ملخص الأداء");
    }
};

export const generateSmartReplies = async (ai: GoogleGenAI, commentText: string, pageProfile?: PageProfile): Promise<string[]> => {
  const pageContext = createPageContext(pageProfile);
  const prompt = `
    ${pageContext}
    أنت مدير مجتمع. اقترح 3 ردود قصيرة واحترافية على تعليق العميل التالي:
    "${commentText}"
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
      },
    });

    const text = response.text;
    if (!text) throw new Error("لم يتمكن الذكاء الاصطناعي من اقتراح ردود (استجابة فارغة).");
    
    const replies = cleanAndParseJson(text);
    if (Array.isArray(replies) && replies.length > 0) {
      return replies.slice(0, 3);
    }
    throw new Error("فشل الذكاء الاصطناعي في إنشاء ردود بالتنسيق المطلوب.");
  } catch (error: any) {
    throw handleGeminiError(error, "اقتراح ردود ذكية");
  }
};

export const generateAutoReply = async (ai: GoogleGenAI, userMessage: string, pageProfile?: PageProfile): Promise<string> => {
  const pageContext = createPageContext(pageProfile);
  const prompt = `
    ${pageContext}
    أنت مساعد خدمة عملاء ذكي لصفحة أعمال على فيسبوك. مهمتك هي الرد على رسالة/تعليق العميل التالي بشكل احترافي ومساعد.
    الرسالة/التعليق: "${userMessage}"
    
    التعليمات:
    1. اقرأ الرسالة جيدًا.
    2. استخدم "سياق الصفحة" المتاح أعلاه لصياغة رد دقيق.
    3. إذا كان السؤال عن سعر أو تفاصيل خدمة/منتج، قدم إجابة مباشرة من "سياق الصفحة".
    4. إذا كان السؤال عامًا، قدم إجابة ودودة ومساعدة.
    5. حافظ على نبرة احترافية.
    6. الرد يجب أن يكون باللغة العربية.
    7. لا تضف أي مقدمات أو عناوين. ابدأ بالرد مباشرة.
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text ?? 'شكرًا لتواصلك، سيتم الرد عليك في أقرب وقت.';
  } catch (error: any) {
    throw handleGeminiError(error, "إنشاء رد تلقائي");
  }
};

export const generateBestPostingTimesHeatmap = async (
  ai: GoogleGenAI,
  posts: PublishedPost[]
): Promise<HeatmapDataPoint[]> => {
  try {
    const postsData = posts.slice(0, 100).map(p => ({ // Limit to 100 posts to avoid huge prompts
      publishedAt: p.publishedAt,
      engagement: (p.analytics.likes ?? 0) + (p.analytics.comments ?? 0) + (p.analytics.shares ?? 0),
    }));

    if (postsData.length === 0) return [];

    const prompt = `
      You are a data analyst. Based on the following list of posts with their publication date (ISO format) and engagement score, generate a heatmap data structure representing the best times to post.
      The higher the engagement score, the better the time slot. Normalize the engagement scores for the heatmap output to be between 0 and 1.

      Post data: ${JSON.stringify(postsData)}

      The output must be a JSON array of objects. Each object represents a cell in a heatmap of days of the week vs. hours of the day and must have the following structure:
      - "day": (number) The day of the week, where Sunday is 0 and Saturday is 6.
      - "hour": (number) The starting hour of the day (0-23).
      - "engagement": (number) A normalized engagement score from 0 (lowest) to 1 (highest) for that time slot.

      Analyze all provided posts and return a comprehensive heatmap data array covering all days and hours. Group hours if necessary (e.g., every 2 hours). It's crucial to return data for the analysis.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.INTEGER },
              hour: { type: Type.INTEGER },
              engagement: { type: Type.NUMBER },
            },
            required: ['day', 'hour', 'engagement']
          }
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Failed to generate heatmap data (empty response).");
    
    const heatmapData = cleanAndParseJson(text);
    if (Array.isArray(heatmapData)) {
      return heatmapData;
    }
    throw new Error("Failed to generate heatmap data in the required format.");

  } catch (error: any) {
    throw handleGeminiError(error, "generating posting times heatmap");
  }
};

export const generateContentTypePerformance = async (
  ai: GoogleGenAI,
  posts: PublishedPost[]
): Promise<ContentTypePerformanceData[]> => {
  try {
    const postsData = posts.slice(0, 100).map(p => ({
      text: p.text.substring(0, 200), // a snippet
      hasImage: !!p.imagePreview,
      engagement: (p.analytics.likes ?? 0) + (p.analytics.comments ?? 0) + (p.analytics.shares ?? 0),
    }));
    
    if (postsData.length === 0) return [];

    const prompt = `
      You are a content strategy analyst. I have a list of posts with their text, whether they have an image, and their engagement score.
      Your task is to categorize each post into one of the following types: "Image Post", "Text-only Post", "Question/Poll", "Promotion/Sale", "Educational/Tip".
      Then, calculate the performance for each content type.

      Here is the data for some of the posts:
      ${JSON.stringify(postsData)}

      Based on ALL posts provided, return a JSON array of objects with the following structure:
      - "type": (string) The content type name.
      - "count": (number) The number of posts of this type.
      - "avgEngagement": (number) The average engagement score for this type.
      
      Example output:
      [
        {"type": "Image Post", "count": 15, "avgEngagement": 120.5},
        {"type": "Promotion/Sale", "count": 5, "avgEngagement": 250.0}
      ]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              count: { type: Type.INTEGER },
              avgEngagement: { type: Type.NUMBER },
            },
            required: ['type', 'count', 'avgEngagement']
          }
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Failed to generate content type performance (empty response).");

    const performanceData = cleanAndParseJson(text);
    if (Array.isArray(performanceData)) {
      return performanceData;
    }
    throw new Error("Failed to generate content type performance in the required format.");
  } catch (error: any) {
    throw handleGeminiError(error, "generating content type performance");
  }
};

export const generateReplyVariations = async (ai: GoogleGenAI, baseReply: string): Promise<string[]> => {
  if (!baseReply.trim()) {
    throw new Error("لا يمكن إنشاء تنويعات من نص فارغ.");
  }
  const prompt = `
    أنت خبير في كتابة الإعلانات. مهمتك هي أخذ رسالة رد أساسية وإنشاء 3 تنويعات إبداعية لها.
    يجب أن تحافظ التنويعات على نفس المعنى ولكن بأساليب مختلفة (واحدة أكثر رسمية، واحدة أكثر وداً، وواحدة مختصرة).

    الرسالة الأساسية:
    "${baseReply}"

    أرجع الرد بتنسيق JSON فقط، على شكل مصفوفة من السلاسل النصية.
    مثال: ["الرد الأول", "الرد الثاني", "الرد الثالث"]
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
      },
    });
    
    const text = response.text;
    if (!text) throw new Error("لم يتمكن الذكاء الاصطناعي من اقتراح تنويعات (استجابة فارغة).");
    
    const variations = cleanAndParseJson(text);
    if (Array.isArray(variations) && variations.length > 0) {
      return variations;
    }
    throw new Error("فشل الذكاء الاصطناعي في إنشاء تنويعات بالتنسيق المطلوب.");
  } catch (error: any) {
    throw handleGeminiError(error, "إنشاء تنويعات الرد");
  }
};
