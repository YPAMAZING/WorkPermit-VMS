import Tesseract from 'tesseract.js'

/**
 * OCR Utility for Meter Reading Extraction
 * Uses Tesseract.js for browser-based OCR
 */

// Progress callback for UI updates
let progressCallback = null

export const setOCRProgressCallback = (callback) => {
  progressCallback = callback
}

/**
 * Extract text from meter image using Tesseract.js
 * @param {File|Blob|string} image - Image file, blob, or URL
 * @returns {Promise<{rawText: string, extractedValue: number|null, confidence: number, unit: string}>}
 */
export const extractMeterReading = async (image) => {
  try {
    const result = await Tesseract.recognize(
      image,
      'eng', // English language
      {
        logger: (m) => {
          if (progressCallback && m.status === 'recognizing text') {
            progressCallback(Math.round(m.progress * 100))
          }
        },
      }
    )

    const rawText = result.data.text
    const confidence = result.data.confidence / 100 // Convert to 0-1 scale

    // Extract numeric values from the text
    const extracted = parseNumericValue(rawText)

    return {
      rawText: rawText.trim(),
      extractedValue: extracted.value,
      confidence,
      unit: extracted.unit,
      allMatches: extracted.allMatches,
    }
  } catch (error) {
    console.error('OCR Error:', error)
    throw new Error('Failed to process image. Please try again or enter reading manually.')
  }
}

/**
 * Parse numeric values and units from OCR text
 * @param {string} text - Raw OCR text
 * @returns {{value: number|null, unit: string, allMatches: string[]}}
 */
const parseNumericValue = (text) => {
  // Common meter reading patterns
  const patterns = [
    // Standard decimal numbers with units
    /(\d{1,10}[.,]\d{1,4})\s*(kWh|kW|mWh|MWh|W|m³|m3|ft³|L|gal|PSI|bar|Pa|°C|°F|dBm|MHz|GHz|Hz|V|A|mA|%)/gi,
    // Numbers with spaces (e.g., "12 345.67")
    /(\d{1,3}(?:\s\d{3})*[.,]\d{1,4})\s*(kWh|kW|mWh|MWh|W|m³|m3|ft³|L|gal|PSI|bar|Pa|°C|°F|dBm|MHz|GHz|Hz|V|A|mA|%)/gi,
    // Plain decimal numbers
    /(\d{1,10}[.,]\d{1,4})/g,
    // Integer numbers (for digital displays)
    /(\d{4,10})/g,
  ]

  const allMatches = []
  let bestMatch = { value: null, unit: '' }

  // Try patterns in order of specificity
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const numStr = match[1].replace(/\s/g, '').replace(',', '.')
      const value = parseFloat(numStr)
      const unit = match[2] || ''

      if (!isNaN(value) && value > 0) {
        allMatches.push({ value, unit, raw: match[0] })

        // Prefer matches with units
        if (unit && !bestMatch.unit) {
          bestMatch = { value, unit }
        } else if (!bestMatch.value) {
          bestMatch = { value, unit }
        }
      }
    }
  }

  return {
    value: bestMatch.value,
    unit: bestMatch.unit,
    allMatches: allMatches.map(m => m.raw),
  }
}

/**
 * Pre-process image for better OCR results
 * @param {File} file - Image file
 * @returns {Promise<string>} - Base64 encoded processed image
 */
export const preprocessImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        // Increase resolution for better OCR
        const scale = Math.max(1, 1500 / Math.max(img.width, img.height))
        canvas.width = img.width * scale
        canvas.height = img.height * scale

        // Draw and apply filters
        ctx.filter = 'contrast(1.2) brightness(1.1)'
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Convert to grayscale for better OCR
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
          data[i] = gray
          data[i + 1] = gray
          data[i + 2] = gray
        }
        ctx.putImageData(imageData, 0, 0)

        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Get suggested unit based on meter type
 * @param {string} meterType - Type of meter
 * @returns {string} - Suggested unit
 */
export const getDefaultUnit = (meterType) => {
  const unitMap = {
    electricity: 'kWh',
    water: 'm³',
    gas: 'm³',
    transmitter: 'dBm',
    temperature: '°C',
    pressure: 'PSI',
    fuel: 'L',
    flow: 'L/min',
    voltage: 'V',
    current: 'A',
    power: 'W',
    frequency: 'Hz',
    humidity: '%',
  }
  return unitMap[meterType] || ''
}

export default {
  extractMeterReading,
  preprocessImage,
  setOCRProgressCallback,
  getDefaultUnit,
}
