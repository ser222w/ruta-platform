'use client';

import { use, useState, type ReactNode } from 'react';
import { trpc } from '@/lib/trpc';
import { PhoneLink } from '@/components/shared/phone-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import Link from 'next/link';
import type { BookingStage } from '@prisma/client';

interface PageProps {
  params: Promise<{ id: string }>;
}

const STAGE_LABELS: Record<BookingStage, string> = {
  QUALIFY: 'Кваліфікація',
  PROPOSAL_1: 'Пропозиція 1',
  REFUSAL_1: 'Відмова 1',
  PROPOSAL_2: 'Пропозиція 2',
  REFUSAL_2: 'Відмова 2',
  PROPOSAL_3: 'Пропозиція 3',
  REFUSAL_3: 'Відмова 3',
  PROPOSAL_4: 'Пропозиція 4',
  INVOICE: 'Рахунок',
  PREPAYMENT: 'Передоплата',
  DEVELOPMENT: 'Розробка',
  CHECKIN: 'Заїзд',
  CHECKOUT: 'Виїзд',
  LOST: 'Втрачено'
};

export default function BookingDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [showPaymentLinkDialog, setShowPaymentLinkDialog] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const { data: booking, isLoading, refetch } = trpc.booking.getById.useQuery({ id });

  const updateStage = trpc.booking.updateStage.useMutation({
    onSuccess: () => {
      toast.success('Стадію оновлено');
      refetch();
    },
    onError: (e) => toast.error(e.message)
  });

  const generateLink = trpc.booking.generatePaymentLink.useMutation({
    onSuccess: (data) => {
      setGeneratedLink(data.url);
      toast.success('Посилання згенеровано');
      refetch();
    },
    onError: (e) => toast.error(e.message)
  });

  if (isLoading) {
    return (
      <div className='p-6 max-w-5xl mx-auto space-y-4'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='h-96 w-full' />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className='p-6 text-center'>
        <p className='text-muted-foreground'>Замовлення не знайдено</p>
        <Link href='/dashboard/bookings'>
          <Button variant='outline' className='mt-4'>
            ← Назад
          </Button>
        </Link>
      </div>
    );
  }

  const handleGenerateLink = () => {
    generateLink.mutate({ bookingId: id });
    setShowPaymentLinkDialog(true);
  };

  const portalUrl = booking.portalToken
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.ruta.cam'}/portal/booking/${booking.portalToken}`
    : null;

  return (
    <div className='p-6 max-w-5xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-3'>
          <Link href='/dashboard/bookings'>
            <Button variant='ghost' size='sm'>
              ←
            </Button>
          </Link>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-xl font-semibold'>{booking.bookingNumber}</h1>
              <Badge>{STAGE_LABELS[booking.stage]}</Badge>
            </div>
            <p className='text-muted-foreground text-sm mt-0.5'>
              {booking.property.name}
              {booking.checkinDate &&
                ` · ${format(new Date(booking.checkinDate), 'dd.MM.yyyy', { locale: uk })}`}
              {booking.checkoutDate &&
                ` — ${format(new Date(booking.checkoutDate), 'dd.MM.yyyy', { locale: uk })}`}
              {` · ${booking.nightsCount} н.`}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          {/* Кнопка надіслати посилання на оплату */}
          <Button onClick={handleGenerateLink} disabled={generateLink.isPending}>
            {generateLink.isPending ? 'Генерація...' : '💳 Надіслати посилання на оплату'}
          </Button>
        </div>
      </div>

      {/* Наступна дія (NextActionBanner) */}
      {booking.stage !== 'CHECKOUT' && booking.stage !== 'LOST' && (
        <Card className='border-blue-200 bg-blue-50/50'>
          <CardContent className='py-3 px-4 flex items-center justify-between'>
            <div>
              <p className='text-blue-900 font-medium text-sm'>Наступна дія</p>
              <p className='text-blue-700 text-xs mt-0.5'>{getNextActionHint(booking.stage)}</p>
            </div>
            {booking.stage !== 'PREPAYMENT' && (
              <Button
                size='sm'
                variant='outline'
                className='border-blue-300 text-blue-700'
                onClick={() => {
                  const next = getNextStage(booking.stage);
                  if (next) updateStage.mutate({ id, stage: next });
                }}
                disabled={updateStage.isPending}
              >
                → {STAGE_LABELS[getNextStage(booking.stage) ?? 'INVOICE']}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5 вкладок */}
      <Tabs defaultValue='inquiry'>
        <TabsList className='grid w-full grid-cols-5'>
          <TabsTrigger value='inquiry'>Запит</TabsTrigger>
          <TabsTrigger value='charges'>Нарахування</TabsTrigger>
          <TabsTrigger value='payments'>Оплати</TabsTrigger>
          <TabsTrigger value='tasks'>Задачі</TabsTrigger>
          <TabsTrigger value='journal'>Журнал</TabsTrigger>
        </TabsList>

        {/* Вкладка 1: Запит */}
        <TabsContent value='inquiry' className='space-y-4 mt-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm'>Гість</CardTitle>
              </CardHeader>
              <CardContent className='space-y-2'>
                {booking.guest ? (
                  <>
                    <InfoRow label="Ім'я" value={booking.guest.name} />
                    <InfoRow label='Телефон' value={<PhoneLink phone={booking.guest.phone} />} />
                    <InfoRow label='Email' value={booking.guest.email} />
                    <InfoRow label='Сегмент' value={booking.guest.loyaltyTier} />
                  </>
                ) : (
                  <p className='text-muted-foreground text-sm'>Гість не прив&apos;язаний</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm'>Бронювання</CardTitle>
              </CardHeader>
              <CardContent className='space-y-2'>
                <InfoRow label='Номер' value={booking.bookingNumber} />
                <InfoRow label='Готель' value={booking.property.name} />
                <InfoRow
                  label='Заїзд'
                  value={
                    booking.checkinDate
                      ? format(new Date(booking.checkinDate), 'dd.MM.yyyy', { locale: uk })
                      : undefined
                  }
                />
                <InfoRow
                  label='Виїзд'
                  value={
                    booking.checkoutDate
                      ? format(new Date(booking.checkoutDate), 'dd.MM.yyyy', { locale: uk })
                      : undefined
                  }
                />
                <InfoRow label='Ночей' value={String(booking.nightsCount)} />
                <InfoRow
                  label='Гостей'
                  value={`${booking.adultsCount} дор.${booking.childrenCount > 0 ? ` + ${booking.childrenCount} діт.` : ''}`}
                />
                {booking.tariff && <InfoRow label='Тариф' value={booking.tariff.name} />}
                {booking.closer && <InfoRow label='Менеджер' value={booking.closer.name} />}
              </CardContent>
            </Card>
          </div>

          {/* Номерні лінії */}
          {booking.roomLines.length > 0 && (
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm'>Номери</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  {booking.roomLines.map((line) => (
                    <div
                      key={line.id}
                      className='flex items-center justify-between py-2 border-b last:border-0'
                    >
                      <div>
                        <p className='text-sm font-medium'>{line.roomCategory.name}</p>
                        <p className='text-muted-foreground text-xs'>
                          {line.roomsCount} кімн. × {line.nightsCount} н.
                        </p>
                      </div>
                      <p className='text-sm font-medium'>{formatCurrency(Number(line.total))}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Вкладка 2: Нарахування */}
        <TabsContent value='charges' className='mt-4'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Розрахунок вартості</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                <ChargesRow label='Проживання' amount={Number(booking.roomsTotal)} />
                <ChargesRow label='Послуги' amount={Number(booking.servicesTotal)} />
                <Separator className='my-2' />
                <ChargesRow label='Знижка' amount={-Number(booking.discountTotal)} highlight />
                <Separator className='my-2' />
                <ChargesRow label='До сплати' amount={Number(booking.grandTotal)} bold />
                <ChargesRow label='Сплачено' amount={Number(booking.paidAmount)} />
                <ChargesRow
                  label='Залишок'
                  amount={Number(booking.grandTotal) - Number(booking.paidAmount)}
                  highlight={Number(booking.grandTotal) > Number(booking.paidAmount)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка 3: Оплати */}
        <TabsContent value='payments' className='mt-4 space-y-4'>
          {/* Графік оплат */}
          {booking.paymentLines.length > 0 ? (
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm'>Графік оплат</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  {booking.paymentLines.map((line) => (
                    <div
                      key={line.id}
                      className='flex items-center justify-between py-2 border-b last:border-0'
                    >
                      <div>
                        <p className='text-sm font-medium'>
                          {line.label ?? `Платіж ${line.sequence}`}
                        </p>
                        {line.dueDate && (
                          <p className='text-muted-foreground text-xs'>
                            до {format(new Date(line.dueDate), 'dd.MM.yyyy', { locale: uk })}
                          </p>
                        )}
                      </div>
                      <div className='text-right'>
                        <p className='text-sm font-medium'>{formatCurrency(Number(line.amount))}</p>
                        <Badge
                          variant={line.status === 'paid' ? 'secondary' : 'outline'}
                          className='text-xs'
                        >
                          {line.status === 'paid' ? 'Сплачено' : 'Очікується'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className='py-8 text-center text-muted-foreground'>
                <p>Графік оплат не сформовано</p>
                <p className='text-sm mt-1'>
                  Натисніть &quot;Надіслати посилання на оплату&quot; для генерації
                </p>
              </CardContent>
            </Card>
          )}

          {/* Платіжне посилання */}
          {portalUrl && (
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm'>Посилання на оплату</CardTitle>
              </CardHeader>
              <CardContent className='flex items-center gap-3'>
                <code className='flex-1 text-xs bg-muted p-2 rounded break-all'>{portalUrl}</code>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    navigator.clipboard.writeText(portalUrl);
                    toast.success('Скопійовано');
                  }}
                >
                  Копіювати
                </Button>
                <a href={portalUrl} target='_blank' rel='noopener noreferrer'>
                  <Button variant='outline' size='sm'>
                    Відкрити
                  </Button>
                </a>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Вкладка 4: Задачі */}
        <TabsContent value='tasks' className='mt-4'>
          <Card>
            <CardContent className='py-4 space-y-2'>
              {booking.tasks.length === 0 && (
                <p className='text-muted-foreground text-sm text-center py-4'>Задач немає</p>
              )}
              {booking.tasks.map((task) => (
                <div key={task.id} className='flex items-center justify-between p-3 rounded border'>
                  <div>
                    <p className='text-sm font-medium'>{task.title}</p>
                    <p className='text-muted-foreground text-xs'>
                      {task.assignedTo.name}
                      {task.dueAt && ` · до ${format(new Date(task.dueAt), 'dd.MM HH:mm')}`}
                    </p>
                  </div>
                  <Badge variant='outline' className='text-xs'>
                    {task.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка 5: Журнал */}
        <TabsContent value='journal' className='mt-4'>
          <Card>
            <CardContent className='py-4 space-y-3'>
              {booking.activities.length === 0 && (
                <p className='text-muted-foreground text-sm text-center py-4'>Журнал порожній</p>
              )}
              {booking.activities.map((act) => (
                <div key={act.id} className='flex gap-3'>
                  <div className='w-1 bg-border rounded-full shrink-0' />
                  <div className='pb-3 flex-1'>
                    <div className='flex items-center gap-2'>
                      <p className='text-sm font-medium'>{act.title}</p>
                      <Badge variant='outline' className='text-xs'>
                        {act.type}
                      </Badge>
                    </div>
                    {act.body && <p className='text-muted-foreground text-xs mt-0.5'>{act.body}</p>}
                    <p className='text-muted-foreground text-xs mt-1'>
                      {act.user?.name && `${act.user.name} · `}
                      {format(new Date(act.createdAt), 'dd.MM.yyyy HH:mm', { locale: uk })}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Діалог: посилання на оплату */}
      <Dialog open={showPaymentLinkDialog} onOpenChange={setShowPaymentLinkDialog}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Посилання на оплату</DialogTitle>
          </DialogHeader>
          <div className='py-2 space-y-3'>
            {generateLink.isPending && <Skeleton className='h-10 w-full' />}
            {(generatedLink ?? portalUrl) && (
              <>
                <p className='text-sm text-muted-foreground'>
                  Посилання дійсне 72 години. Відправте гостю через будь-який канал.
                </p>
                <code className='block text-xs bg-muted p-3 rounded break-all'>
                  {generatedLink ?? portalUrl}
                </code>
              </>
            )}
          </div>
          <DialogFooter className='gap-2'>
            <Button
              variant='outline'
              onClick={() => {
                const link = generatedLink ?? portalUrl;
                if (link) {
                  navigator.clipboard.writeText(link);
                  toast.success('Скопійовано');
                }
              }}
              disabled={!generatedLink && !portalUrl}
            >
              Копіювати
            </Button>
            <Button onClick={() => setShowPaymentLinkDialog(false)}>Закрити</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className='flex items-start gap-3'>
      <p className='text-muted-foreground text-xs w-20 shrink-0 pt-0.5'>{label}</p>
      <div className='text-sm'>{value}</div>
    </div>
  );
}

function ChargesRow({
  label,
  amount,
  bold = false,
  highlight = false
}: {
  label: string;
  amount: number;
  bold?: boolean;
  highlight?: boolean;
}) {
  if (amount === 0 && !bold) return null;
  return (
    <div className={`flex items-center justify-between ${bold ? 'font-semibold' : ''}`}>
      <p className={`text-sm ${highlight ? 'text-destructive' : ''}`}>{label}</p>
      <p className={`text-sm ${highlight ? 'text-destructive' : ''}`}>
        {formatCurrency(Math.abs(amount))}
        {amount < 0 && ' (знижка)'}
      </p>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0
  }).format(amount);
}

function getNextStage(current: BookingStage): BookingStage | null {
  const flow: Partial<Record<BookingStage, BookingStage>> = {
    QUALIFY: 'PROPOSAL_1',
    PROPOSAL_1: 'INVOICE',
    PROPOSAL_2: 'INVOICE',
    PROPOSAL_3: 'INVOICE',
    PROPOSAL_4: 'INVOICE',
    INVOICE: 'PREPAYMENT',
    PREPAYMENT: 'DEVELOPMENT',
    DEVELOPMENT: 'CHECKIN',
    CHECKIN: 'CHECKOUT'
  };
  return flow[current] ?? null;
}

function getNextActionHint(stage: BookingStage): string {
  const hints: Partial<Record<BookingStage, string>> = {
    QUALIFY: 'Відправити першу пропозицію',
    PROPOSAL_1: 'Сформувати рахунок і відправити посилання на оплату',
    PROPOSAL_2: 'Сформувати рахунок і відправити посилання на оплату',
    PROPOSAL_3: 'Фінальна пропозиція — відправити посилання на оплату',
    PROPOSAL_4: 'Відправити посилання на оплату',
    INVOICE: 'Очікуємо оплату — відправити посилання на оплату',
    DEVELOPMENT: 'Фармер: зателефонувати для уточнення потреб',
    CHECKIN: 'Підтвердити заїзд з гостем'
  };
  return hints[stage] ?? 'Оновити статус';
}
