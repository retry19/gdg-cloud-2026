import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
const pdfParse = require('pdf-parse');
import { analyzeCVAgainstJD, autofixCV } from './services/analyzer';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Configure multer for file uploads (CVs)
const upload = multer({ storage: multer.memoryStorage() });

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'jmf-analyzer' });
});

// Upload and analyze CV against Job Description
app.post('/api/analyze', upload.single('cv'), async (req, res) => {
  try {
    const jdText = req.body.jd;
    const cvFile = req.file;

    if (!jdText || !cvFile) {
       res.status(400).json({ error: 'Job Description text and CV file are required.' });
       return;
    }

    // Extract text from the uploaded PDF
    let cvText = "";
    if (cvFile.mimetype === 'application/pdf') {
        const data = await pdfParse(cvFile.buffer);
        cvText = data.text;
    } else {
        // Fallback for raw text files (or docx if supported later, for now just treat as text if not PDF)
        cvText = cvFile.buffer.toString('utf-8');
    }
    
    // Analyze using Gemini
    const result = await analyzeCVAgainstJD(jdText, cvText);
    res.json(result);

  } catch (error) {
    console.error('Error during analysis:', error);
    res.status(500).json({ error: 'Failed to analyze job market fit.' });
  }
});

// Auto-fix CV based on analysis feedback
app.post('/api/autofix', async (req, res) => {
  try {
    const { cvText, jdText, analysis } = req.body;

    if (!cvText || !jdText || !analysis) {
       res.status(400).json({ error: 'CV text, job description, and analysis are required.' });
       return;
    }

    const result = await autofixCV(jdText, cvText, analysis);
    res.json(result);

  } catch (error) {
    console.error('Error during autofix:', error);
    res.status(500).json({ error: 'Failed to auto-fix CV.' });
  }
});

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
