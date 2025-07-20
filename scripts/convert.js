const fs = require('fs-extra');
const path = require('path');
const mammoth = require('mammoth');

// Ensure result directory exists
const resultDir = path.join(__dirname, '../result');
fs.ensureDirSync(resultDir);

// Process all DOCX files in data directory
const dataDir = path.join(__dirname, '../data');
const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.docx'));

async function processFiles() {
  for (const file of files) {
    try {
      const filePath = path.join(dataDir, file);
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;
      
      // Split text into chapters
      const chapters = [];
      let currentChapter = null;
      
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.match(/^chapter\s+\d+/i) || line.match(/^[0-9]+\./i)) {
          // New chapter found
          if (currentChapter) {
            chapters.push(currentChapter);
          }
          currentChapter = {
            title: line.trim(),
            content: []
          };
        } else if (currentChapter) {
          // Add content to current chapter
          const trimmedLine = line.trim();
          if (trimmedLine) {
            currentChapter.content.push(trimmedLine);
          }
        }
      }
      
      // Add the last chapter
      if (currentChapter) {
        chapters.push(currentChapter);
      }
      
      // Prepare final structure
      const jsonData = {
        filename: file.replace('.docx', ''),
        chapters: chapters.map(chapter => ({
          ...chapter,
          content: chapter.content.join('\n')
        }))
      };
      
      // Write JSON file
      const outputPath = path.join(resultDir, `${file.replace('.docx', '')}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
      console.log(`Converted ${file} to JSON`);
      
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
}

processFiles();
