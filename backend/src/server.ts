import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
const pdfParse = require('pdf-parse');
import { analyzeCVAgainstJD } from './services/analyzer';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
