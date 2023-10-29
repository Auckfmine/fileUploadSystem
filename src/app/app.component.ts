import { Component } from '@angular/core';
import { FileProcessingService } from './file-processing.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'test-pdf';
  images:string[] =[];
  pdfUrl:any = null;

  constructor(private fileProcessingService: FileProcessingService) {}

  async onFilesSelected(event:any) {
    const files: FileList = event.target.files;
    const processedImages = await this.fileProcessingService.processFiles(files)
    this.images.push(...processedImages);
  }

  async generatePdf() {
    this.pdfUrl = await this.fileProcessingService.generatePdf(this.images);
  }
}
