import * as fabric from 'fabric';
import jsPDF from 'jspdf';
import { MagazineData } from '../types';

export const generateMagazinePDF = async (magazine: MagazineData): Promise<Blob> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const canvasWidth = 595;
  const canvasHeight = 842;

  for (let i = 0; i < magazine.pages.length; i++) {
    if (i > 0) pdf.addPage();
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
    const fCanvas = new fabric.StaticCanvas(tempCanvas);
    
    if (magazine.pages[i].fabricData) {
      await fCanvas.loadFromJSON(magazine.pages[i].fabricData);
    }
    fCanvas.renderAll();
    const imgData = fCanvas.toDataURL({ format: 'jpeg', quality: 0.9, multiplier: 2 });
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    fCanvas.dispose();
  }

  return pdf.output('blob');
};
