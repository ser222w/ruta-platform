'use client';

import { use, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
import { toast } from 'sonner';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PhoneLink } from '@/components/shared/phone-link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function InquiryDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [showConvert, setShowConvert] = useState(false);

  // Дані звернення
  const { data: inquiry, isLoading, refetch } = trpc.inquiry.getById.useQuery({ id });

  // Список готелів для форми конвертації
  const { data: properties } = trpc.property.list.useQuery();
  const [convertForm, setConvertForm] = useState({
    propertyId: '',
    checkInDate: '',
    checkOutDate: '',
    adultsCount: 2
  });

  // Мутації
  const updateStatus = trpc.inquiry.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Статус оновлено');
      refetch();
    },
    onError: (e) => toast.error(e.message)
  });

  const convertToBooking = trpc.inquiry.convertToBooking.useMutation({
    onSuccess: (booking) => {
      toast.success(`Замовлення ${booking.bookingNumber} створено`);
      router.push(`/dashboard/bookings/${booking.id}`);
    },
    onError: (e) =>
      toast.error(e.message, { action: { label: 'Retry', onClick: () => handleConvert() } })
  });

  const handleConvert = () => {
    if (!convertForm.propertyId || !convertForm.checkInDate || !convertForm.checkOutDate) {
      toast.error('Заповніть готель та дати');
      return;
    }
    convertToBooking.mutate({
      inquiryId: id,
      propertyId: convertForm.propertyId,
      checkInDate: convertForm.checkInDate,
      checkOutDate: convertForm.checkOutDate,
      adultsCount: convertForm.adultsCount,
      contactName: inquiry?.contactName ?? undefined,
      contactPhone: inquiry?.contactPhone ?? undefined,
      guestId: inquiry?.guestId ?? undefined
    });
  };

  if (isLoading) {
    return (
      <div className='p-6 max-w-4xl mx-auto space-y-4'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-64 w-full' />
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className='p-6 text-center'>
        <p className='text-muted-foreground'>Звернення не знайдено</p>
        <Link href='/dashboard/inquiries'>
          <Button variant='outline' className='mt-4'>
            ← Назад до списку
          </Button>
        </Link>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    NEW: 'Нове',
    IN_PROGRESS: 'В роботі',
    CONVERTED: 'Конвертовано',
    ARCHIVED: 'Архів'
  };

  return (
    <div className='p-6 max-w-4xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Link href='/dashboard/inquiries'>
            <Button variant='ghost' size='sm'>
              ←
            </Button>
          </Link>
          <div>
            <h1 className='text-xl font-semibold'>
              {inquiry.guest?.name ?? inquiry.contactName ?? inquiry.contactPhone ?? 'Звернення'}
            </h1>
            <p className='text-muted-foreground text-sm'>
              {format(new Date(inquiry.createdAt), 'dd.MM.yyyy HH:mm', { locale: uk })}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Badge>{statusLabels[inquiry.status] ?? inquiry.status}</Badge>
          {inquiry.status !== 'CONVERTED' && inquiry.status !== 'ARCHIVED' && (
            <Button
              onClick={() => {
                setConvertForm({
                  propertyId: inquiry.property?.id ?? '',
                  checkInDate: inquiry.checkInDate
                    ? new Date(inquiry.checkInDate).toISOString().split('T')[0]
                    : '',
                  checkOutDate: inquiry.checkOutDate
                    ? new Date(inquiry.checkOutDate).toISOString().split('T')[0]
                    : '',
                  adultsCount: inquiry.adultsCount ?? 2
                });
                setShowConvert(true);
              }}
            >
              Створити замовлення
            </Button>
          )}
          {inquiry.booking && (
            <Link href={`/dashboard/bookings/${inquiry.booking.id}`}>
              <Button variant='outline'>{inquiry.booking.bookingNumber} →</Button>
            </Link>
          )}
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* Контактні дані */}
        <Card className='md:col-span-2'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>Контактна інформація</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <InfoRow label="Ім'я" value={inquiry.guest?.name ?? inquiry.contactName} />
            <InfoRow
              label='Телефон'
              value={<PhoneLink phone={inquiry.guest?.phone ?? inquiry.contactPhone} />}
            />
            {inquiry.guest?.email && <InfoRow label='Email' value={inquiry.guest.email} />}
            <Separator />
            <InfoRow label='Готель' value={inquiry.property?.name} />
            {inquiry.checkInDate && (
              <InfoRow
                label='Заїзд'
                value={format(new Date(inquiry.checkInDate), 'dd.MM.yyyy', { locale: uk })}
              />
            )}
            {inquiry.checkOutDate && (
              <InfoRow
                label='Виїзд'
                value={format(new Date(inquiry.checkOutDate), 'dd.MM.yyyy', { locale: uk })}
              />
            )}
            <InfoRow label='Гостей' value={String(inquiry.adultsCount)} />
            {inquiry.contactNote && (
              <>
                <Separator />
                <div>
                  <p className='text-muted-foreground text-xs mb-1'>Нотатка</p>
                  <p className='text-sm'>{inquiry.contactNote}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Статус + дії */}
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>Статус</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div>
              <p className='text-muted-foreground text-xs mb-1'>Поточний</p>
              <Badge className='text-sm'>{statusLabels[inquiry.status]}</Badge>
            </div>
            {inquiry.source && (
              <div>
                <p className='text-muted-foreground text-xs mb-1'>Джерело</p>
                <p className='text-sm'>{inquiry.source}</p>
              </div>
            )}
            {inquiry.assignedTo && (
              <div>
                <p className='text-muted-foreground text-xs mb-1'>Менеджер</p>
                <p className='text-sm'>{inquiry.assignedTo.name}</p>
              </div>
            )}
            {inquiry.status === 'NEW' && (
              <Button
                variant='outline'
                size='sm'
                className='w-full'
                onClick={() => updateStatus.mutate({ id, status: 'IN_PROGRESS' })}
                disabled={updateStatus.isPending}
              >
                Взяти в роботу
              </Button>
            )}
            {inquiry.status !== 'ARCHIVED' && inquiry.status !== 'CONVERTED' && (
              <Button
                variant='ghost'
                size='sm'
                className='w-full text-muted-foreground'
                onClick={() => updateStatus.mutate({ id, status: 'ARCHIVED' })}
                disabled={updateStatus.isPending}
              >
                Архівувати
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Задачі */}
      {inquiry.tasks.length > 0 && (
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>Задачі</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            {inquiry.tasks.map((task) => (
              <div key={task.id} className='flex items-center justify-between p-3 rounded border'>
                <div>
                  <p className='text-sm font-medium'>{task.title}</p>
                  {task.dueAt && (
                    <p className='text-muted-foreground text-xs'>
                      до {format(new Date(task.dueAt), 'dd.MM HH:mm')}
                    </p>
                  )}
                </div>
                <Badge variant='outline' className='text-xs'>
                  {task.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Діалог конвертації */}
      <Dialog open={showConvert} onOpenChange={setShowConvert}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Створити замовлення</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <div className='space-y-1.5'>
              <Label>Готель</Label>
              <Select
                value={convertForm.propertyId}
                onValueChange={(v) => setConvertForm((p) => ({ ...p, propertyId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Оберіть готель' />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label>Заїзд</Label>
                <Input
                  type='date'
                  value={convertForm.checkInDate}
                  onChange={(e) => setConvertForm((p) => ({ ...p, checkInDate: e.target.value }))}
                />
              </div>
              <div className='space-y-1.5'>
                <Label>Виїзд</Label>
                <Input
                  type='date'
                  value={convertForm.checkOutDate}
                  onChange={(e) => setConvertForm((p) => ({ ...p, checkOutDate: e.target.value }))}
                />
              </div>
            </div>
            <div className='space-y-1.5'>
              <Label>Дорослих</Label>
              <Select
                value={String(convertForm.adultsCount)}
                onValueChange={(v) => setConvertForm((p) => ({ ...p, adultsCount: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowConvert(false)}>
              Скасувати
            </Button>
            <Button onClick={handleConvert} disabled={convertToBooking.isPending}>
              {convertToBooking.isPending ? 'Створення...' : 'Створити замовлення'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className='flex items-start gap-3'>
      <p className='text-muted-foreground text-xs w-20 shrink-0 pt-0.5'>{label}</p>
      <div className='text-sm'>{value}</div>
    </div>
  );
}
