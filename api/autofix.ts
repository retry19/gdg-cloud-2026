import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

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

async function autofixCV(jdText: string, cvText: string, analysis: { gaps: { type: string; text: string }[]; recommendations: string[] }) {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cvText, jdText, analysis } = req.body;

    if (!cvText || !jdText || !analysis) {
      return res.status(400).json({ error: 'CV text, job description, and analysis are required.' });
    }

    const result = await autofixCV(jdText, cvText, analysis);
    res.json(result);

  } catch (error) {
    console.error('Error during autofix:', error);
    res.status(500).json({ error: 'Failed to auto-fix CV.' });
  }
}
