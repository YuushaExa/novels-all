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
      
      // Split text into sections
      const sections = [];
      let currentSection = null;
      
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Check for new section (chapter, prologue, epilogue, etc.)
        if (trimmedLine.match(/^(chapter\s+\d+|epilogue|prologue|appendix|[0-9]+\.)/i)) {
          // Finalize previous section if exists
          if (currentSection) {
            if (currentSection.content.trim()) { // Only add if content exists
              sections.push(currentSection);
            }
          }
          // Start new section
          currentSection = {
            type: getSectionType(trimmedLine),
            title: trimmedLine,
            content: ''
          };
        } else if (currentSection) {
          // Add content to current section
          if (trimmedLine) {
            currentSection.content += (currentSection.content ? '\n' : '') + trimmedLine;
          }
        }
      }
      
      // Add the last section if it has content
      if (currentSection && currentSection.content.trim()) {
        sections.push(currentSection);
      }
      
      // Prepare final structure
      const jsonData = {
        filename: file.replace('.docx', ''),
        sections: sections
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

// Helper function to determine section type
function getSectionType(title) {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('Глава')) return 'chapter';
  if (lowerTitle.includes('Пролог')) return 'prologue';
  if (lowerTitle.includes('Эпилог')) return 'epilogue';
  if (lowerTitle.includes('appendix')) return 'appendix';
  if (/^\d+\./.test(lowerTitle)) return 'numbered_section';
  return 'section';
}

processFiles();
