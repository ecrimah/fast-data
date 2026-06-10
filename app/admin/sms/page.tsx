'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api/admin-client';
import { GlassPanel, NexusBtn, NexusHeader, NexusPage, NexusPill, NexusTable } from '@/components/admin/fds-ui';

export default function AdminSmsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('FDS test message from SMS hub.');
  const [result, setResult] = useState('');

  const load = () => adminFetch('/api/admin/sms').then((d) => setLogs(d.logs ?? []));

  useEffect(() => {
    load();
  }, []);

  const sendTest = async () => {
    setResult('Sending…');
    try {
      const r = await adminFetch('/api/admin/sms', {
        method: 'POST',
        body: JSON.stringify({ phone, message }),
      });
      setResult(r.ok ? 'Sent via Moolre' : r.error || 'Failed');
      load();
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <NexusPage>
      <NexusHeader
        eyebrow="Communications"
        title="SMS hub (Moolre)"
        description="Test sends, delivery logs, and template debugging — powered by Moolre SMS API."
      />
      <GlassPanel glow="sky" className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs font-bold text-white/50">Test phone</label>
          <input className="fds-input mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024XXXXXXX" />
        </div>
        <div>
          <label className="text-xs font-bold text-white/50">Message</label>
          <input className="fds-input mt-1" value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <NexusBtn variant="gold" onClick={sendTest}>
          Send test SMS
        </NexusBtn>
        {result && <p className="text-xs text-white/50">{result}</p>}
      </GlassPanel>

      <GlassPanel>
        <h3 className="mb-3 font-bold text-white">SMS log</h3>
        <NexusTable>
          <thead>
            <tr>
              <th>Time</th>
              <th>Template</th>
              <th>To</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="text-xs">{new Date(log.created_at).toLocaleString()}</td>
                <td>{log.template}</td>
                <td className="font-mono text-xs">{log.recipient}</td>
                <td>
                  <NexusPill tone={log.status === 'sent' ? 'success' : log.status === 'skipped' ? 'neutral' : 'danger'}>
                    {log.status}
                  </NexusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </NexusTable>
      </GlassPanel>
    </NexusPage>
  );
}
