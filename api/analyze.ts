import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
const pdfParse = require('pdf-parse');

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

async function analyzeCVAgainstJD(jdText: string, cvText: string) {
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

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart form data
    const chunks: Buffer[] = [];
    
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    const boundary = getBoundary(req.headers['content-type'] || '');
    
    if (!boundary) {
      return res.status(400).json({ error: 'Invalid content type' });
    }
    
    const parts = parseMultipart(buffer, boundary);
    const jdText = parts.find(p => p.name === 'jd')?.data?.toString('utf-8');
    const cvFile = parts.find(p => p.name === 'cv');
    
    if (!jdText || !cvFile) {
      return res.status(400).json({ error: 'Job Description text and CV file are required.' });
    }

    // Extract text from the uploaded PDF
    let cvText = "";
    if (cvFile.contentType === 'application/pdf') {
      const data = await pdfParse(cvFile.data);
      cvText = data.text;
    } else {
      cvText = cvFile.data.toString('utf-8');
    }
    
    // Analyze using Gemini
    const result = await analyzeCVAgainstJD(jdText, cvText);
    res.json(result);

  } catch (error) {
    console.error('Error during analysis:', error);
    res.status(500).json({ error: 'Failed to analyze job market fit.' });
  }
}

function getBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^\s;]+))/);
  return match ? match[1] || match[2] : null;
}

interface MultipartPart {
  name: string;
  contentType: string;
  data: Buffer;
}

function parseMultipart(buffer: Buffer, boundary: string): MultipartPart[] {
  const parts: MultipartPart[] = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundary = Buffer.from(`--${boundary}--`);
  
  let start = buffer.indexOf(boundaryBuffer) + boundaryBuffer.length + 2; // Skip \r\n
  
  while (start < buffer.length) {
    const end = buffer.indexOf(boundaryBuffer, start);
    if (end === -1) break;
    
    const partBuffer = buffer.slice(start, end - 2); // Remove trailing \r\n
    const headerEnd = partBuffer.indexOf('\r\n\r\n');
    
    if (headerEnd !== -1) {
      const headerStr = partBuffer.slice(0, headerEnd).toString('utf-8');
      const data = partBuffer.slice(headerEnd + 4);
      
      const nameMatch = headerStr.match(/name="([^"]+)"/);
      const contentTypeMatch = headerStr.match(/Content-Type:\s*([^\s;]+)/);
      
      if (nameMatch) {
        parts.push({
          name: nameMatch[1],
          contentType: contentTypeMatch ? contentTypeMatch[1] : 'text/plain',
          data: Buffer.from(data)
        });
      }
    }
    
    start = end + boundaryBuffer.length + 2;
  }
  
  return parts;
}
