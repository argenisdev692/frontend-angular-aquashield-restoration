import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';

import { AvailabilityExceptionFormComponent } from './availability-exception-form.component';
import { AvailabilityFeatureService } from '../services/availability-feature.service';

const serviceStub: Partial<AvailabilityFeatureService> = {
  getById: () => Promise.reject(new Error('not called')),
};

// Mutable route stub so each test can set the :id param before instantiating.
const routeStub = { snapshot: { params: {} as Record<string, string> } };

describe('AvailabilityExceptionFormComponent', () => {
  beforeEach(() => {
    routeStub.snapshot.params = {};
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideLocationMocks(),
        { provide: AvailabilityFeatureService, useValue: serviceStub },
        { provide: ActivatedRoute, useValue: routeStub },
      ],
    });
  });

  // Instantiate the class in an injection context (no template render — the
  // template pulls in the sidebar/ThemeService which needs localStorage).
  function create(routeId?: string): AvailabilityExceptionFormComponent {
    if (routeId) routeStub.snapshot.params = { id: routeId };
    return TestBed.runInInjectionContext(() => new AvailabilityExceptionFormComponent());
  }

  it('is in create mode without a route id', () => {
    expect(create().isEdit()).toBe(false);
  });

  it('is in edit mode with a route id', () => {
    expect(create('abc').isEdit()).toBe(true);
  });

  it('requires a date', () => {
    const cmp = create();
    expect(cmp.form.valid).toBe(false);
    cmp.form.patchValue({ date: '2026-07-04' });
    expect(cmp.form.valid).toBe(true);
  });

  it('toCreateDto normalises an empty reason to null', () => {
    expect(
      create().toCreateDto({ date: '2026-07-04', isAvailable: false, reason: '' })
    ).toEqual({ date: '2026-07-04', isAvailable: false, reason: null });
  });

  it('toCreateDto keeps a provided reason and coerces availability to boolean', () => {
    expect(
      create().toCreateDto({ date: '2026-12-25', isAvailable: true, reason: 'Christmas' })
    ).toEqual({ date: '2026-12-25', isAvailable: true, reason: 'Christmas' });
  });
});
