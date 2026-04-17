'use client';

import { useState } from 'react';
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
import type { InquirySource } from '@prisma/client';

export default function TodayPage() {
  const router = useRouter();
  const [showNewInquiry, setShowNewInquiry] = useState(false);

  // Дані черги
  const {
    data: taskQueue,
    isLoading: tasksLoading,
    refetch: refetchTasks
  } = trpc.task.getMyQueue.useQuery();
  const {
    data: inquiries,
    isLoading: inquiriesLoading,
    refetch: refetchInquiries
  } = trpc.inquiry.list.useQuery({
    status: 'NEW',
    limit: 20
  });

  // Мутація: нове звернення
  const createInquiry = trpc.inquiry.create.useMutation({
    onSuccess: (data) => {
      toast.success('Звернення створено');
      setShowNewInquiry(false);
      refetchInquiries();
      router.push(`/dashboard/inquiries/${data.id}`);
    },
    onError: (e) =>
      toast.error(e.message, {
        action: { label: 'Retry', onClick: () => createInquiry.mutate(formData) }
      })
  });

  // Стан форми нового звернення
  const [formData, setFormData] = useState<{
    contactPhone: string;
    contactName: string;
    source: InquirySource;
  }>({
    contactPhone: '',
    contactName: '',
    source: 'MANUAL'
  });

  const handleCreateInquiry = () => {
    createInquiry.mutate({
      ...formData,
      adultsCount: 2
    });
  };

  // Завершити задачу
  const completeTask = trpc.task.complete.useMutation({
    onSuccess: () => {
      toast.success('Задачу завершено');
      refetchTasks();
    },
    onError: (e) => toast.error(e.message)
  });

  const isLoading = tasksLoading || inquiriesLoading;

  // EOD прогрес: зелений якщо 0 нових + 0 прострочених
  const overdueCount = taskQueue?.overdue.length ?? 0;
  const newInquiriesCount = inquiries?.total ?? 0;
  const eodDone = overdueCount === 0 && newInquiriesCount === 0;

  return (
    <div className='p-6 max-w-6xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-semibold'>Сьогодні</h1>
          <p className='text-muted-foreground text-sm mt-1'>
            {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: uk })}
          </p>
        </div>
        <Button onClick={() => setShowNewInquiry(true)}>+ Нове звернення</Button>
      </div>

      {/* EOD Mission */}
      <Card className={eodDone ? 'border-green-500' : 'border-orange-400'}>
        <CardContent className='py-3 px-4 flex items-center gap-4'>
          <span className={`text-2xl font-bold ${eodDone ? 'text-green-600' : 'text-orange-500'}`}>
            {eodDone ? '✓' : `${overdueCount + newInquiriesCount}`}
          </span>
          <div>
            <p className='font-medium text-sm'>
              {eodDone ? 'Завершення дня — місія виконана!' : 'До завершення дня'}
            </p>
            <p className='text-muted-foreground text-xs'>
              {overdueCount > 0 && `${overdueCount} прострочених задач`}
              {overdueCount > 0 && newInquiriesCount > 0 && ' · '}
              {newInquiriesCount > 0 && `${newInquiriesCount} нових звернень`}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Нові звернення */}
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base flex items-center gap-2'>
              Нові звернення
              {newInquiriesCount > 0 && <Badge variant='destructive'>{newInquiriesCount}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            {inquiriesLoading &&
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className='h-14 w-full' />)}
            {!inquiriesLoading && inquiries?.items.length === 0 && (
              <p className='text-muted-foreground text-sm py-4 text-center'>Нових звернень немає</p>
            )}
            {inquiries?.items.map((inq) => (
              <Link key={inq.id} href={`/dashboard/inquiries/${inq.id}`} className='block'>
                <div className='flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors'>
                  <div>
                    <p className='font-medium text-sm'>
                      {inq.guest?.name ?? inq.contactName ?? inq.contactPhone ?? 'Без імені'}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {inq.property?.name ?? 'Готель не вказано'}
                      {inq.checkInDate && ` · ${format(new Date(inq.checkInDate), 'dd.MM')}`}
                    </p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <SourceBadge source={inq.source} />
                    <span className='text-muted-foreground text-xs'>
                      {format(new Date(inq.createdAt), 'HH:mm')}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            {(inquiries?.total ?? 0) > 10 && (
              <Link
                href='/dashboard/inquiries'
                className='block text-center text-sm text-blue-600 hover:underline pt-2'
              >
                Показати всі ({inquiries?.total})
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Черга задач */}
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base flex items-center gap-2'>
              Черга задач
              {overdueCount > 0 && <Badge variant='destructive'>{overdueCount} прострочено</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            {tasksLoading &&
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className='h-14 w-full' />)}

            {/* Прострочені */}
            {(taskQueue?.overdue.length ?? 0) > 0 && (
              <>
                <p className='text-xs text-destructive font-medium uppercase tracking-wide'>
                  Прострочені
                </p>
                {taskQueue?.overdue.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    overdue
                    onComplete={(id) => completeTask.mutate({ id })}
                  />
                ))}
                {(taskQueue?.today.length ?? 0) > 0 && <Separator />}
              </>
            )}

            {/* На сьогодні */}
            {taskQueue?.today.map((task) => (
              <TaskRow key={task.id} task={task} onComplete={(id) => completeTask.mutate({ id })} />
            ))}

            {!tasksLoading && (taskQueue?.total ?? 0) === 0 && (
              <p className='text-muted-foreground text-sm py-4 text-center'>Черга задач порожня</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Діалог: Нове звернення */}
      <Dialog open={showNewInquiry} onOpenChange={setShowNewInquiry}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Нове звернення</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <div className='space-y-1.5'>
              <Label htmlFor='phone'>Телефон</Label>
              <Input
                id='phone'
                name='phone'
                placeholder='+380671234567'
                value={formData.contactPhone}
                onChange={(e) => setFormData((p) => ({ ...p, contactPhone: e.target.value }))}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='firstName'>Ім&apos;я</Label>
              <Input
                id='firstName'
                name='firstName'
                placeholder="Ім'я гостя"
                value={formData.contactName}
                onChange={(e) => setFormData((p) => ({ ...p, contactName: e.target.value }))}
              />
            </div>
            <div className='space-y-1.5'>
              <Label>Джерело</Label>
              <Select
                value={formData.source}
                onValueChange={(v) => setFormData((p) => ({ ...p, source: v as InquirySource }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='MANUAL'>Вручну</SelectItem>
                  <SelectItem value='PHONE'>Дзвінок</SelectItem>
                  <SelectItem value='TELEGRAM'>Telegram</SelectItem>
                  <SelectItem value='WHATSAPP'>WhatsApp</SelectItem>
                  <SelectItem value='INSTAGRAM'>Instagram</SelectItem>
                  <SelectItem value='SITE_FORM'>Форма сайту</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowNewInquiry(false)}>
              Скасувати
            </Button>
            <Button onClick={handleCreateInquiry} disabled={createInquiry.isPending}>
              {createInquiry.isPending ? 'Створення...' : 'Створити'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

interface TaskData {
  id: string;
  title: string;
  type: string;
  dueAt: Date | string | null;
  booking?: { id: string; bookingNumber: string; guest?: { name: string } | null } | null;
  inquiry?: { id: string; contactName: string | null } | null;
}

function TaskRow({
  task,
  overdue = false,
  onComplete
}: {
  task: TaskData;
  overdue?: boolean;
  onComplete: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border ${overdue ? 'border-destructive/50 bg-destructive/5' : ''}`}
    >
      <div className='flex-1 min-w-0'>
        <p className='font-medium text-sm truncate'>{task.title}</p>
        <p className='text-muted-foreground text-xs'>
          {task.booking && (
            <Link href={`/dashboard/bookings/${task.booking.id}`} className='hover:underline'>
              {task.booking.bookingNumber}
              {task.booking.guest?.name && ` · ${task.booking.guest.name}`}
            </Link>
          )}
          {task.dueAt && (
            <span className={overdue ? 'text-destructive ml-2' : 'ml-2'}>
              {format(new Date(task.dueAt), 'dd.MM HH:mm')}
            </span>
          )}
        </p>
      </div>
      <Button
        variant='ghost'
        size='sm'
        onClick={() => onComplete(task.id)}
        className='ml-2 shrink-0'
      >
        ✓
      </Button>
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const labels: Record<string, string> = {
    PHONE: 'Дзвінок',
    TELEGRAM: 'TG',
    WHATSAPP: 'WA',
    INSTAGRAM: 'IG',
    SITE_FORM: 'Форма',
    MANUAL: 'Вручну',
    RINGOSTAT: 'Ringostat',
    VIBER: 'Viber'
  };
  return (
    <Badge variant='secondary' className='text-xs'>
      {labels[source] ?? source}
    </Badge>
  );
}
