import { analyzeCVAgainstJD } from './services/analyzer';
import fs from 'fs';
const pdfParse = require('pdf-parse');

async function test() {
    try {
        const jdText = fs.readFileSync('../jd.txt', 'utf-8');
        const pdfBuffer = fs.readFileSync('../CV_Yuda Muhamad.pdf');
        const data = await pdfParse(pdfBuffer);
        const cvText = data.text;
        console.log("Extracted CV Length:", cvText.length);
        console.log("Analyzing with Gemini...");
        const result = await analyzeCVAgainstJD(jdText, cvText);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("TEST FAILED", e);
    }
}
test();
