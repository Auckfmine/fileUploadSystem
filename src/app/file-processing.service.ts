import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';
GlobalWorkerOptions.workerSrc = "assets/pdf.worker.min.js"
@Injectable({
  providedIn: 'root'
})
export class FileProcessingService {

  constructor() { }

  async processFiles(files: FileList): Promise<string[]> {
    const images: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/pdf') {
        const pdfImages = await this.processPdfFile(file);
        images.push(...pdfImages);
      } else if (file.type.startsWith('image/')) {
        const image = await this.processImageFile(file);
        images.push(image);
      }
    }
    return images;
  }

  private async processPdfFile(file: File): Promise<string[]> {
    const images: string[] = [];
    const reader = new FileReader();
    await new Promise<void>((resolve, reject) => {
      reader.onload = async (e: any) => {
        try {
          const pdfData = e.target.result;
          const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const canvas = document.createElement('canvas');
            const viewport = page.getViewport({ scale: 1 });
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: canvas.getContext('2d') as CanvasRenderingContext2D , viewport }).promise;
            const imgDataUrl = canvas.toDataURL('image/jpg');
            images.push(imgDataUrl);
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
    return images;
  }

  private processImageFile(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            const pngDataUrl = canvas.toDataURL('image/jpg');
            resolve(pngDataUrl);
          } catch (error) {
            reject(error);
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  generatePdf(images: string[]): Promise<URL> {
    return new Promise<URL>((resolve, reject) => {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imagePromises = images.map((imgData, i) => {
            return new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const imgWidth = img.width;
                        const imgHeight = img.height;
                        const pageWidth = pdf.internal.pageSize.getWidth();
                        const pageHeight = pdf.internal.pageSize.getHeight();
                        const scaleX = pageWidth / imgWidth;
                        const scaleY = pageHeight / imgHeight;
                        const scale = Math.min(scaleX, scaleY);
                        const width = imgWidth * scale;
                        const height = imgHeight * scale;
                        const x = (pageWidth - width) / 2;
                        const y = (pageHeight - height) / 2;
                        if (i > 0) {
                            pdf.addPage();
                        }
                        pdf.addImage(imgData, 'JPG', x, y, width, height);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                };
                img.src = imgData;
            });
        });

        Promise.all(imagePromises)
            .then(() => {
                const pdfOutput = pdf.output('bloburl');
                resolve(pdfOutput);
            })
            .catch(error => {
                reject(error);
            });
    });
}

}
