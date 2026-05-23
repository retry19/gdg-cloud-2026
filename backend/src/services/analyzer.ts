import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// The schema is strictly requested to match our PRD requirements
const systemInstruction = `
You are an expert technical recruiter and AI matching engine. 
You will receive two text inputs: a Job Description (JD) and a Candidate's CV (Resume).
Your task is to analyze the CV against the JD and return a JSON object with the exact following structure:

{
  "overallFitScore": number (0-100),
  "skillsFit": number (0-100),
  "expFit": number (0-100),
  "eduFit": number (0-100),
  "gaps": [
    {
      "type": "Critical" | "Medium" | "Low",
      "text": "Description of the gap"
    }
  ],
  "recommendations": [
    "String recommendation on how to rephrase or add missing context to the CV"
  ]
}

Weights for overall score:
- Hard Skills (45%)
- Experience (35%)
- Soft Skills (10%)
- Education/Certifications (10%)

Be highly accurate and provide actionable rephrasing recommendations.
Ensure the response is STRICTLY valid JSON.
`;

export async function analyzeCVAgainstJD(jdText: string, cvText: string) {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not set. Returning mock response.");
        return getMockResponse();
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    try {
        const prompt = `Job Description:\n${jdText}\n\n---\n\nCandidate CV:\n${cvText}`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json',
                temperature: 0.2
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        } else {
            throw new Error("No text returned from Gemini");
        }
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}

function getMockResponse() {
    return {
        overallFitScore: 82,
        skillsFit: 90,
        expFit: 75,
        eduFit: 100,
        gaps: [
            { type: 'Critical', text: 'Missing Hard Skill: "Kubernetes"' },
            { type: 'Medium', text: 'Missing Experience: "Leading Agile teams"' }
        ],
        recommendations: [
            "Add Kubernetes under technical skills if you have worked with it in your cloud deployments.",
            "Rephrase your project management bullet to emphasize Agile methodology leadership."
        ]
    };
}
