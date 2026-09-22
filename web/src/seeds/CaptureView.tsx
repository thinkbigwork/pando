/**
 * Captura de contactos nuevos (semillas), pensada para el celular. Un botón
 * grande "Nuevo contacto" con Hablar, Escanear QR, Foto de tarjeta y Escribir.
 * Funciona offline: encola en IndexedDB y reintenta al recuperar la conexión.
 * La extracción de datos la hace el backend (processSeed). Ver docs/01-producto.md.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseQr } from '@pando/shared';
import { submitCapture, uploadAndCreate } from './capture';
import { drain, list, type QueuedCapture } from './queue';

interface Props {
  currentUid: string | null;
  /** Modo muestra: no escribe. */
  sample?: boolean;
}

type Mode = 'menu' | 'manual' | 'recording';

function newId(): string {
  return 'c' + Date.now() + Math.random().toString(36).slice(2, 7);
}

export function CaptureView({ currentUid, sample }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('menu');
  const [eventName, setEventName] = useState('');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const mediaRef = useRef<{ rec: MediaRecorder; chunks: Blob[] } | null>(null);

  const refreshPending = useCallback(() => {
    void list().then((r) => setPending(r.length));
  }, []);

  useEffect(() => {
    refreshPending();
    const onOnline = () => {
      if (currentUid)
        void drain((c) => uploadAndCreate(c, currentUid).then(() => undefined)).then(
          refreshPending,
        );
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [currentUid, refreshPending]);

  async function send(c: QueuedCapture, okKey: string) {
    if (sample || !currentUid) {
      setMsg(t('capture.sampleNote'));
      return;
    }
    const res = await submitCapture(c, currentUid);
    setMsg(res.queued ? t('capture.queued') : t(okKey));
    setText('');
    setMode('menu');
    refreshPending();
  }

  function submitText() {
    if (!text.trim()) return;
    void send(
      {
        id: newId(),
        channel: 'manual',
        eventId: eventName || undefined,
        raw: { text: text.trim() },
        createdAt: new Date().toISOString(),
      },
      'capture.saved',
    );
  }

  async function scanQr() {
    setMsg(null);
    const Detector = (
      window as unknown as {
        BarcodeDetector?: new (o: object) => {
          detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
        };
      }
    ).BarcodeDetector;
    if (!Detector) {
      setMsg(t('capture.qrUnsupported'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const detector = new Detector({ formats: ['qr_code'] });
      const started = Date.now();
      const tick = async () => {
        const codes = await detector.detect(video);
        if (codes[0]) {
          stream.getTracks().forEach((tr) => tr.stop());
          const parsed = parseQr(codes[0].rawValue);
          const raw: Record<string, unknown> = { qrText: codes[0].rawValue };
          const extracted = 'extracted' in parsed ? parsed.extracted : undefined;
          void send(
            {
              id: newId(),
              channel: 'qr',
              eventId: eventName || undefined,
              raw,
              extracted,
              createdAt: new Date().toISOString(),
            },
            'capture.saved',
          );
          return;
        }
        if (Date.now() - started < 20000) requestAnimationFrame(() => void tick());
        else {
          stream.getTracks().forEach((tr) => tr.stop());
          setMsg(t('capture.qrTimeout'));
        }
      };
      void tick();
    } catch {
      setMsg(t('capture.cameraError'));
    }
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await send(
      {
        id: newId(),
        channel: 'foto',
        eventId: eventName || undefined,
        raw: {},
        blob: file,
        createdAt: new Date().toISOString(),
      },
      'capture.savedPhoto',
    );
  }

  async function startRecording() {
    setMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        void send(
          {
            id: newId(),
            channel: 'voz',
            eventId: eventName || undefined,
            raw: {},
            blob,
            createdAt: new Date().toISOString(),
          },
          'capture.savedAudio',
        );
      };
      mediaRef.current = { rec, chunks };
      rec.start();
      setMode('recording');
    } catch {
      setMsg(t('capture.micError'));
    }
  }

  function stopRecording() {
    mediaRef.current?.rec.stop();
    setMode('menu');
  }

  return (
    <div className="capture">
      <h2>{t('capture.title')}</h2>
      <label className="capture__event">
        {t('capture.event')}
        <input
          type="text"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          placeholder={t('capture.eventPlaceholder')}
        />
      </label>

      {msg && <p className="capture__msg">{msg}</p>}

      {mode === 'menu' && (
        <div className="capture__grid">
          <button className="capture__big" onClick={() => void startRecording()}>
            🎤<span>{t('capture.speak')}</span>
          </button>
          <button className="capture__big" onClick={() => void scanQr()}>
            🔳<span>{t('capture.scanQr')}</span>
          </button>
          <label className="capture__big">
            📇<span>{t('capture.photo')}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => void onPhoto(e)}
            />
          </label>
          <button className="capture__big" onClick={() => setMode('manual')}>
            ✏️<span>{t('capture.write')}</span>
          </button>
        </div>
      )}

      {mode === 'recording' && (
        <div className="capture__recording">
          <p>{t('capture.recording')}</p>
          <button className="primary" onClick={stopRecording}>
            {t('capture.stop')}
          </button>
        </div>
      )}

      {mode === 'manual' && (
        <div className="capture__manual">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('capture.manualPlaceholder')}
          />
          <div className="capture__manualActions">
            <button className="primary" onClick={submitText}>
              {t('capture.save')}
            </button>
            <button onClick={() => setMode('menu')}>{t('card.cancel')}</button>
          </div>
        </div>
      )}

      {pending > 0 && (
        <p className="capture__pending muted">{t('capture.pending', { count: pending })}</p>
      )}
    </div>
  );
}
