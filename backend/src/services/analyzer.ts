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

const autofixSystemInstruction = `
You are an expert CV editor and career coach.
You will receive:
1. A Job Description (JD)
2. A Candidate's CV (Resume)
3. An analysis object containing gaps and recommendations

Your task is to rewrite the CV to better match the JD by incorporating the feedback.
Split the CV into logical sections (e.g., "Technical Skills", "Work Experience - Company Name", "Education", "Projects", etc.) and for each section that needs improvement, provide both the original text and an improved version.

Return a JSON object with this exact structure:
{
  "improvedSections": [
    {
      "sectionTitle": "Name of the CV section",
      "original": "The original text from the CV for this section",
      "improved": "The rewritten version incorporating the feedback"
    }
  ],
  "summary": "A brief 2-3 sentence summary of all changes made and why"
}

Rules:
- Only include sections that were modified. Do NOT include unchanged sections.
- Preserve the candidate's factual accuracy. Do NOT fabricate experience, skills, or achievements.
- Incorporate keywords from the JD naturally where the candidate's experience supports it.
- Apply the recommendations from the analysis.
- Keep the improved text professional and concise.
- Ensure the response is STRICTLY valid JSON.
`;

export async function autofixCV(jdText: string, cvText: string, analysis: { gaps: { type: string; text: string }[]; recommendations: string[] }) {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not set. Returning mock autofix response.");
        return getMockAutofixResponse();
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    try {
        const prompt = `Job Description:\n${jdText}\n\n---\n\nCandidate CV:\n${cvText}\n\n---\n\nAnalysis Feedback:\nGaps:\n${analysis.gaps.map(g => `- [${g.type}] ${g.text}`).join('\n')}\n\nRecommendations:\n${analysis.recommendations.map(r => `- ${r}`).join('\n')}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: autofixSystemInstruction,
                responseMimeType: 'application/json',
                temperature: 0.3
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        } else {
            throw new Error("No text returned from Gemini");
        }
    } catch (error) {
        console.error("Gemini API Error (autofix):", error);
        throw error;
    }
}

function getMockAutofixResponse() {
    return {
        improvedSections: [
            {
                sectionTitle: "Technical Skills",
                original: "Cloud: AWS, Docker\nOrchestration: Docker Compose",
                improved: "Cloud: AWS, Docker\nOrchestration: Kubernetes, Docker Compose"
            },
            {
                sectionTitle: "Work Experience - Senior Dev",
                original: "Managed database servers and deployed applications using CI/CD pipelines.",
                improved: "Optimized and scaled PostgreSQL databases, improving query performance by 25%. Led Agile sprint planning and retrospectives for a team of 5 engineers, driving continuous delivery via CI/CD pipelines."
            }
        ],
        summary: "Added Kubernetes to technical skills based on the critical gap identified. Rephrased the work experience bullet to emphasize Agile leadership and quantified database optimization results, aligning with the job description requirements."
    };
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
