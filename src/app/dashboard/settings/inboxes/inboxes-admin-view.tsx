'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ChannelBadge } from '@/components/inbox/channel-badge';
import { toast } from 'sonner';

const CHANNEL_TYPES = [
  { value: 'TELEGRAM', label: 'Telegram' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'SMS', label: 'SMS (TurboSMS)' },
  { value: 'ECHAT_VIBER', label: 'Viber (e-chat)' },
  { value: 'ECHAT_TG_PERSONAL', label: 'TG Personal (e-chat)' }
];

interface InboxForm {
  channelType: string;
  name: string;
  externalId: string;
  brandId: string;
  // Channel-specific config fields
  botToken?: string;
  smtpUser?: string;
  smtpPass?: string;
  fromAddress?: string;
  apiToken?: string;
  senderName?: string;
  apiKey?: string;
  senderId?: string;
}

export function InboxesAdminView() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<InboxForm>({
    channelType: 'TELEGRAM',
    name: '',
    externalId: '',
    brandId: ''
  });

  const utils = trpc.useUtils();
  const { data: inboxes, isLoading } = trpc.inbox.listInboxes.useQuery({ activeOnly: false });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — tRPC v11 deep type inference issue with complex input schemas
  const createMutation = trpc.inbox.createInbox.useMutation({
    onSuccess: () => {
      toast.success('Inbox створено');
      setOpen(false);
      utils.inbox.listInboxes.invalidate();
    },
    onError: (err) => toast.error(err.message)
  });

  const updateMutation = trpc.inbox.updateInbox.useMutation({
    onSuccess: () => {
      toast.success('Inbox оновлено');
      setOpen(false);
      utils.inbox.listInboxes.invalidate();
    },
    onError: (err) => toast.error(err.message)
  });

  function buildConfig(): Record<string, unknown> {
    switch (form.channelType) {
      case 'TELEGRAM':
        return { botToken: form.botToken ?? '' };
      case 'EMAIL':
        return {
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpUser: form.smtpUser ?? '',
          smtpPass: form.smtpPass ?? '',
          fromAddress: form.fromAddress ?? form.smtpUser ?? ''
        };
      case 'SMS':
        return { apiToken: form.apiToken ?? '', senderName: form.senderName ?? 'RUTA' };
      case 'ECHAT_VIBER':
      case 'ECHAT_TG_PERSONAL':
        return {
          apiKey: form.apiKey ?? '',
          channel: form.channelType === 'ECHAT_VIBER' ? 'viber' : 'tg',
          senderId: form.senderId ?? ''
        };
      default:
        return {};
    }
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.channelType || !form.externalId.trim()) {
      toast.error('Заповніть обовʼязкові поля');
      return;
    }

    if (editId) {
      updateMutation.mutate({
        id: editId,
        name: form.name,
        brandId: form.brandId || undefined,
        config: buildConfig()
      });
    } else {
      createMutation.mutate({
        channelType: form.channelType,
        name: form.name,
        externalId: form.externalId,
        brandId: form.brandId || undefined,
        config: buildConfig()
      });
    }
  }

  function handleToggleActive(id: string, isActive: boolean) {
    updateMutation.mutate({ id, isActive: !isActive });
  }

  function openCreate() {
    setEditId(null);
    setForm({ channelType: 'TELEGRAM', name: '', externalId: '', brandId: '' });
    setOpen(true);
  }

  return (
    <div className='p-6'>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-xl font-semibold'>Канали (Inboxes)</h1>
          <p className='text-muted-foreground mt-0.5 text-sm'>
            Налаштуйте підключення до месенджерів та email
          </p>
        </div>
        <Button onClick={openCreate} size='sm'>
          + Додати канал
        </Button>
      </div>

      {isLoading && <p className='text-muted-foreground text-sm'>Завантаження…</p>}

      <div className='space-y-2'>
        {(inboxes ?? []).map((inbox) => (
          <div
            key={inbox.id}
            className='flex items-center justify-between rounded-lg border px-4 py-3'
          >
            <div className='flex items-center gap-3'>
              <ChannelBadge channel={inbox.channelType} />
              <div>
                <p className='text-sm font-medium'>{inbox.name}</p>
                <p className='text-muted-foreground text-xs'>
                  {inbox.brand?.name ?? 'Без готелю'} · ID: {inbox.externalId}
                </p>
                <p className='text-muted-foreground font-mono text-[10px]'>
                  Webhook: /api/webhooks/
                  {inbox.channelType.toLowerCase().replace('echat_', 'echat/')}/{inbox.id}
                </p>
              </div>
            </div>

            <div className='flex items-center gap-3'>
              <Switch
                checked={inbox.isActive}
                onCheckedChange={() => handleToggleActive(inbox.id, inbox.isActive)}
              />
              <span className='text-muted-foreground text-xs'>
                {inbox.isActive ? 'Активний' : 'Вимкнено'}
              </span>
            </div>
          </div>
        ))}

        {!isLoading && (inboxes ?? []).length === 0 && (
          <p className='text-muted-foreground py-8 text-center text-sm'>
            Каналів ще немає. Додайте перший!
          </p>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>{editId ? 'Редагувати канал' : 'Новий канал'}</DialogTitle>
          </DialogHeader>

          <div className='space-y-4 py-2'>
            <div>
              <Label>Тип каналу *</Label>
              <Select
                value={form.channelType}
                onValueChange={(v) => setForm((f) => ({ ...f, channelType: v }))}
                disabled={!!editId}
              >
                <SelectTrigger className='mt-1'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_TYPES.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Назва *</Label>
              <Input
                className='mt-1'
                placeholder='Наприклад: Polyana TG Bot'
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <Label>External ID *</Label>
              <Input
                className='mt-1'
                placeholder='bot_id, email address, phone number…'
                value={form.externalId}
                onChange={(e) => setForm((f) => ({ ...f, externalId: e.target.value }))}
                disabled={!!editId}
              />
            </div>

            {/* Channel-specific config fields */}
            {form.channelType === 'TELEGRAM' && (
              <div>
                <Label>Bot Token</Label>
                <Input
                  className='mt-1 font-mono text-xs'
                  placeholder='123456:AABBcc...'
                  value={form.botToken ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, botToken: e.target.value }))}
                />
              </div>
            )}

            {form.channelType === 'EMAIL' && (
              <>
                <div>
                  <Label>Gmail адреса</Label>
                  <Input
                    className='mt-1'
                    placeholder='odoo@rutahnr.com'
                    value={form.smtpUser ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, smtpUser: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Gmail App Password</Label>
                  <Input
                    className='mt-1 font-mono text-xs'
                    type='password'
                    placeholder='xxxx xxxx xxxx xxxx'
                    value={form.smtpPass ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, smtpPass: e.target.value }))}
                  />
                </div>
              </>
            )}

            {form.channelType === 'SMS' && (
              <>
                <div>
                  <Label>TurboSMS API Token</Label>
                  <Input
                    className='mt-1 font-mono text-xs'
                    value={form.apiToken ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, apiToken: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Sender Name</Label>
                  <Input
                    className='mt-1'
                    placeholder='RUTA'
                    value={form.senderName ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, senderName: e.target.value }))}
                  />
                </div>
              </>
            )}

            {(form.channelType === 'ECHAT_VIBER' || form.channelType === 'ECHAT_TG_PERSONAL') && (
              <>
                <div>
                  <Label>e-chat API Key</Label>
                  <Input
                    className='mt-1 font-mono text-xs'
                    value={form.apiKey ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Sender Phone</Label>
                  <Input
                    className='mt-1'
                    placeholder='+380987330000'
                    value={form.senderId ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, senderId: e.target.value }))}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setOpen(false)}>
              Скасувати
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editId ? 'Зберегти' : 'Створити'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
