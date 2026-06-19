import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { PostsFeatureService } from '../services/posts-feature.service';
import { CreatePostDto, UpdatePostInput, PostResponse } from '../models/posts.types';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CrudFormBase, CrudService } from '../../../shared/crud-form-base';

@Component({
  selector: 'app-posts-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, SidebarComponent],
  templateUrl: './posts-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './posts-form.component.css',
})
export class PostsFormComponent extends CrudFormBase<PostResponse, CreatePostDto, UpdatePostInput> {
  private api = inject(PostsFeatureService);
  readonly drawerVisible = signal(false);

  readonly statuses: ReadonlyArray<'draft' | 'published' | 'scheduled'> = [
    'draft',
    'published',
    'scheduled',
  ];

  /** Adapter so `create` resolves to the full entity (CrudFormBase contract). */
  get service(): CrudService<PostResponse, CreatePostDto, UpdatePostInput> {
    return {
      getById: (id) => this.api.getById(id),
      create: (dto) => this.api.create(dto).then((r) => this.api.getById(r.id)),
      update: (id, dto) => this.api.update(id, dto),
    };
  }

  buildForm(): FormGroup {
    return this.fb.group({
      postTitle: ['', [Validators.required, Validators.minLength(3)]],
      postExcerpt: [''],
      postContent: [''],
      postStatus: ['draft' as 'draft' | 'published' | 'scheduled'],
      metaTitle: [''],
      metaDescription: [''],
      metaKeywords: [''],
    });
  }

  patchFromEntity(entity: PostResponse, form: FormGroup): void {
    form.patchValue({
      postTitle: entity.postTitle ?? '',
      postExcerpt: entity.postExcerpt ?? '',
      postContent: entity.postContent ?? '',
      postStatus: entity.postStatus,
      metaTitle: entity.metaTitle ?? '',
      metaDescription: entity.metaDescription ?? '',
      metaKeywords: entity.metaKeywords ?? '',
    });
  }

  toCreateDto(v: any): CreatePostDto {
    return {
      postTitle: v.postTitle,
      postContent: v.postContent || undefined,
      postExcerpt: v.postExcerpt || null,
      postStatus: v.postStatus,
      metaTitle: v.metaTitle || null,
      metaDescription: v.metaDescription || null,
      metaKeywords: v.metaKeywords || null,
    };
  }

  toUpdateDto(v: any): UpdatePostInput {
    return {
      postTitle: v.postTitle,
      postContent: v.postContent || undefined,
      postExcerpt: v.postExcerpt || null,
      postStatus: v.postStatus,
      metaTitle: v.metaTitle || null,
      metaDescription: v.metaDescription || null,
      metaKeywords: v.metaKeywords || null,
    };
  }

  get listRoute(): string {
    return '/posts';
  }
}
