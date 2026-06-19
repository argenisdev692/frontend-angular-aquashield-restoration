import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

import { BlogCategoriesFeatureService } from '../services/blog-categories-feature.service';
import {
  CreateBlogCategoryDto,
  UpdateBlogCategoryDto,
  BlogCategoryResponse,
} from '../models/blog-categories.types';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CrudFormBase } from '../../../shared/crud-form-base';

@Component({
  selector: 'app-blog-categories-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    PageHeaderComponent,
    SidebarComponent,
  ],
  templateUrl: './blog-categories-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './blog-categories-form.component.css',
})
export class BlogCategoriesFormComponent extends CrudFormBase<
  BlogCategoryResponse,
  CreateBlogCategoryDto,
  UpdateBlogCategoryDto
> {
  protected api = inject(BlogCategoriesFeatureService);
  readonly drawerVisible = signal(false);

  get service() {
    return this.api;
  }

  buildForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      image: [null as string | null],
    });
  }

  patchFromEntity(entity: BlogCategoryResponse, form: FormGroup): void {
    form.patchValue({
      name: entity.name ?? '',
      description: entity.description ?? '',
      image: entity.image,
    });
  }

  toCreateDto(v: any): CreateBlogCategoryDto {
    return {
      name: v.name,
      description: v.description || null,
      image: v.image,
    };
  }

  toUpdateDto(v: any): UpdateBlogCategoryDto {
    return {
      name: v.name,
      description: v.description || null,
      image: v.image,
    };
  }

  get listRoute(): string {
    return '/blog-categories';
  }

  // ── Category-specific methods ──

  onImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const id = this.entityId();
    if (id) {
      this.api.uploadImage(id, file).then((category) => {
        this.form.patchValue({ image: category.image });
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.form.patchValue({ image: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  }

  onDeleteImage(): void {
    const id = this.entityId();
    if (!id) {
      this.form.patchValue({ image: null });
      return;
    }
    this.api.deleteImage(id).then(() => {
      this.form.patchValue({ image: null });
    });
  }
}
