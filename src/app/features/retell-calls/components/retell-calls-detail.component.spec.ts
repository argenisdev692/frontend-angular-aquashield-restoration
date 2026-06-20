import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';

import { RetellCallsDetailComponent } from './retell-calls-detail.component';
import { RetellCallsFeatureService } from '../services/retell-calls-feature.service';
import { ConfirmService, ConfirmRequest } from '../../../shared/notifications/confirm.service';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { CallResponse } from '../models/retell-calls.types';

function call(overrides: Partial<CallResponse> = {}): CallResponse {
  return {
    id: '1',
    callId: 'call_1',
    agentId: 'agent_1',
    callType: 'phone_call',
    direction: 'inbound',
    fromNumber: '+15550001111',
    toNumber: '+15550002222',
    callStatus: 'ended',
    disconnectionReason: 'user_hangup',
    startedAt: '2026-06-01T10:00:00Z',
    endedAt: '2026-06-01T10:03:20Z',
    durationMs: 200000,
    userSentiment: 'Positive',
    callSummary: 'Customer asked about pricing.',
    transcript: 'Agent: Hello…',
    recordingUrl: 'https://rec.test/1.wav',
    isRead: false,
    status: 'active',
    createdAt: '2026-06-01T10:03:30Z',
    updatedAt: '2026-06-01T10:03:30Z',
    deletedAt: null,
    ...overrides,
  };
}

let getByIdResult: Promise<CallResponse>;
const service = {
  getById: vi.fn(() => getByIdResult),
  markRead: vi.fn(() => Promise.resolve({})),
  delete: vi.fn(() => Promise.resolve()),
  restore: vi.fn(() => Promise.resolve({})),
};

let lastConfirm: ConfirmRequest | undefined;
const confirm = {
  confirm: vi.fn((request: ConfirmRequest) => {
    lastConfirm = request;
    return Promise.resolve(true);
  }),
};

const notify = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
};

describe('RetellCallsDetailComponent', () => {
  beforeEach(() => {
    getByIdResult = Promise.resolve(call());
    lastConfirm = undefined;
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideLocationMocks(),
        { provide: RetellCallsFeatureService, useValue: service },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notify },
      ],
    });

    // Blank out the template so creating the component doesn't render the
    // sidebar (it injects ThemeService, which touches localStorage). We only
    // exercise the class logic; the `:id` input is set via setInput below.
    TestBed.overrideComponent(RetellCallsDetailComponent, {
      set: { template: '', imports: [] },
    });
  });

  // Create the component and set the `:id` route input via setInput.
  function create(id = '1'): RetellCallsDetailComponent {
    const fixture = TestBed.createComponent(RetellCallsDetailComponent);
    fixture.componentRef.setInput('id', id);
    return fixture.componentInstance;
  }

  // Let the resource loader settle so `call()` exposes the resolved value.
  async function createResolved(): Promise<RetellCallsDetailComponent> {
    const cmp = create();
    await TestBed.inject(ApplicationRef).whenStable();
    return cmp;
  }

  it('exposes the :id route input via callId', () => {
    expect(create('1').callId()).toBe('1');
  });

  it('loads the call and marks an unread/active call as read', async () => {
    await createResolved();
    expect(service.getById).toHaveBeenCalledWith('1');
    expect(service.markRead).toHaveBeenCalledWith('1');
  });

  it('does NOT mark read when the call is already read', async () => {
    getByIdResult = Promise.resolve(call({ isRead: true }));
    await createResolved();
    expect(service.markRead).not.toHaveBeenCalled();
  });

  it('does NOT mark read when the call is trashed', async () => {
    getByIdResult = Promise.resolve(call({ deletedAt: '2026-06-10T00:00:00Z' }));
    await createResolved();
    expect(service.markRead).not.toHaveBeenCalled();
  });

  it('exposes the resolved call and its deleted state', async () => {
    const cmp = await createResolved();
    expect(cmp.call()?.id).toBe('1');
    expect(cmp.isDeleted()).toBe(false);
  });

  it('isDeleted reflects a trashed call', async () => {
    getByIdResult = Promise.resolve(call({ isRead: true, deletedAt: '2026-06-10T00:00:00Z' }));
    const cmp = await createResolved();
    expect(cmp.isDeleted()).toBe(true);
  });

  it('builds a title from the direction and counterpart number', async () => {
    const cmp = await createResolved();
    expect(cmp.title()).toBe('Inbound · +15550001111');
  });

  it('falls back to "Call Detail" before the call resolves', () => {
    expect(create().title()).toBe('Call Detail');
  });

  it('formats duration (ms) as m:ss', async () => {
    const cmp = await createResolved();
    expect(cmp.duration()).toBe('3:20');
  });

  it('returns em dash for a null duration', async () => {
    getByIdResult = Promise.resolve(call({ isRead: true, durationMs: null }));
    const cmp = await createResolved();
    expect(cmp.duration()).toBe('—');
  });

  it('maps sentiment to a token chip class', async () => {
    getByIdResult = Promise.resolve(call({ isRead: true, userSentiment: 'Negative' }));
    const cmp = await createResolved();
    expect(cmp.sentimentClass()).toContain('sentiment-chip-negative');
  });

  it('onBack navigates to the list', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    create().onBack();
    expect(navigate).toHaveBeenCalledWith(['/retell-calls']);
  });

  it('onDelete opens a danger confirm whose action deletes then navigates', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const cmp = await createResolved();

    cmp.onDelete();
    expect(confirm.confirm).toHaveBeenCalled();
    expect(lastConfirm?.variant).toBe('danger');
    expect(lastConfirm?.title).toBe('Delete call');

    await lastConfirm!.action();
    expect(service.delete).toHaveBeenCalledWith('1');
    expect(navigate).toHaveBeenCalledWith(['/retell-calls']);
  });

  it('onRestore opens a success confirm whose action restores the call', async () => {
    const cmp = await createResolved();

    cmp.onRestore();
    expect(lastConfirm?.variant).toBe('success');
    expect(lastConfirm?.title).toBe('Restore call');

    await lastConfirm!.action();
    expect(service.restore).toHaveBeenCalledWith('1');
  });

  it('onCopyTranscript copies the transcript and toasts success', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const cmp = await createResolved();

    await cmp.onCopyTranscript();
    expect(writeText).toHaveBeenCalledWith('Agent: Hello…');
    expect(notify.success).toHaveBeenCalledWith('Transcript copied');
  });

  it('onCopyTranscript is a no-op when there is no transcript', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    getByIdResult = Promise.resolve(call({ isRead: true, transcript: null }));
    const cmp = await createResolved();

    await cmp.onCopyTranscript();
    expect(writeText).not.toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
  });
});
