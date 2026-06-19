import {
  Component,
  ElementRef,
  ViewChild,
  input,
  output,
  signal,
  effect,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

@Component({
  selector: 'app-image-cropper-dialog',
  imports: [CommonModule, DialogModule, ButtonModule],
  templateUrl: './image-cropper-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './image-cropper-dialog.component.css',
})
export class ImageCropperDialogComponent {
  private elRef = inject(ElementRef);

  visible = input(false);
  imageUrl = input<string | null>(null);
  aspectRatio = input<number>(1);
  circular = input(false);

  visibleChange = output<boolean>();
  cropped = output<Blob>();

  @ViewChild('imageElement', { static: false }) imageElement!: ElementRef<HTMLImageElement>;

  protected readonly loading = signal(true);
  private cropperInstance: Cropper | null = null;

  constructor() {
    effect(() => {
      const isVisible = this.visible();
      const url = this.imageUrl();
      if (isVisible && url) {
        this.loading.set(true);
        setTimeout(() => this.initCropper(), 100);
      } else if (!isVisible && this.cropperInstance) {
        this.cropperInstance.destroy();
        this.cropperInstance = null;
      }
    });
  }

  private initCropper(): void {
    const img = this.imageElement?.nativeElement;
    if (!img) return;

    if (this.cropperInstance) {
      this.cropperInstance.destroy();
    }

    this.cropperInstance = new Cropper(img, {
      aspectRatio: this.aspectRatio(),
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 0.8,
      restore: false,
      guides: true,
      center: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      ready: () => {
        this.loading.set(false);
        if (this.circular()) {
          this.applyCircularMask();
        }
      },
    });
  }

  private applyCircularMask(): void {
    const face = this.elRef.nativeElement.querySelector('.cropper-face') as HTMLElement;
    const viewBox = this.elRef.nativeElement.querySelector('.cropper-view-box') as HTMLElement;
    if (face) face.style.borderRadius = '50%';
    if (viewBox) viewBox.style.borderRadius = '50%';
  }

  protected onCancel(): void {
    this.visibleChange.emit(false);
  }

  protected onApply(): void {
    if (!this.cropperInstance) return;

    const canvas = this.cropperInstance.getCroppedCanvas({
      width: 512,
      height: 512,
      fillColor: '#fff',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    canvas.toBlob(
      (blob) => {
        if (blob) {
          this.cropped.emit(blob);
          this.visibleChange.emit(false);
        }
      },
      'image/jpeg',
      0.92,
    );
  }

  protected rotate(deg: number): void {
    this.cropperInstance?.rotate(deg);
  }

  protected zoom(ratio: number): void {
    this.cropperInstance?.zoom(ratio);
  }

  protected reset(): void {
    this.cropperInstance?.reset();
  }
}
