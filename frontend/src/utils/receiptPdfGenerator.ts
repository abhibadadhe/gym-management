import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Ensures all <img> elements inside a container are fully loaded before capturing
 */
const waitForImages = async (element: HTMLElement): Promise<void> => {
  const images = Array.from(element.querySelectorAll('img'));
  const pendingImages = images.filter((img) => !img.complete);

  if (pendingImages.length === 0) return;

  await Promise.all(
    pendingImages.map(
      (img) =>
        new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Resolve anyway so we don't block indefinitely
        })
    )
  );
};

/**
 * Generates an exact 1:1 pixel-perfect PDF file from a DOM receipt element.
 * Captures all CSS styles, fonts, Indian Rupee (₹) symbols, rounded corners,
 * badges, and official stamp seals with ultra-crisp retina resolution.
 */
export const generatePdfFromElement = async (
  elementId: string,
  fileName: string
): Promise<File | null> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Receipt element with ID "${elementId}" not found in DOM.`);
    return null;
  }

  try {
    // Wait for all logo and seal images to finish loading
    await waitForImages(element);

    // Capture the element using html2canvas
    const canvas = await html2canvas(element, {
      scale: 2.5, // 2.5x scale for sharp vector-like print & mobile viewing quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1280, // Emulate high-res viewport so media queries don't collapse cards
      onclone: (clonedDoc) => {
        const clonedEl = clonedDoc.getElementById(elementId);
        if (clonedEl) {
          // Force fixed card width for the capture so it renders consistently regardless of viewport
          clonedEl.style.width = '640px';
          clonedEl.style.maxWidth = '640px';
          clonedEl.style.margin = '0 auto';
          clonedEl.style.overflow = 'visible';
          clonedEl.style.boxSizing = 'border-box';
          clonedEl.style.boxShadow = 'none'; // Clean flat border for the PDF page
        }
      },
    });

    const imgData = canvas.toDataURL('image/png', 1.0);

    // Standard A4 width in PostScript points is 595.28 pt
    const pdfWidth = 595.28;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: [pdfWidth, pdfHeight],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    const pdfBlob = pdf.output('blob');

    return new File([pdfBlob], fileName, { type: 'application/pdf' });
  } catch (error) {
    console.error('Error generating PDF from DOM element:', error);
    return null;
  }
};
