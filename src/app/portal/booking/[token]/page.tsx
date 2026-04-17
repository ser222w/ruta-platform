import { notFound } from 'next/navigation';
import { getBookingByPortalToken } from '@/server/services/portal';
import { generateLiqPayForm } from '@/server/services/liqpay';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const booking = await getBookingByPortalToken(token);
  if (!booking) return { title: 'Бронювання не знайдено' };
  return {
    title: `Оплата бронювання ${booking.bookingNumber} — ${booking.property.name}`,
    robots: { index: false, follow: false }
  };
}

export default async function GuestPortalPage({ params }: PageProps) {
  const { token } = await params;
  const booking = await getBookingByPortalToken(token);

  if (!booking) {
    notFound();
  }

  // Знаходимо перший pending платіж у графіку
  const pendingPayment = booking.paymentLines.find((l) => l.status === 'pending');
  const paymentAmount = pendingPayment
    ? Number(pendingPayment.amount)
    : Number(booking.grandTotal) - Number(booking.paidAmount);

  // Генеруємо LiqPay форму якщо є ключі і сума > 0
  const liqpayPublicKey = booking.property.liqpayPublicKey ?? process.env.LIQPAY_PUBLIC_KEY;
  const liqpayPrivateKey = process.env.LIQPAY_PRIVATE_KEY;
  let liqpayForm: { data: string; signature: string } | null = null;

  if (liqpayPublicKey && liqpayPrivateKey && paymentAmount > 0) {
    const orderId = pendingPayment?.paymentToken ?? `booking-${booking.id}-${Date.now()}`;
    liqpayForm = generateLiqPayForm({
      publicKey: liqpayPublicKey,
      privateKey: liqpayPrivateKey,
      amount: paymentAmount,
      currency: 'UAH',
      description: `Оплата бронювання ${booking.bookingNumber} — ${booking.property.name}`,
      orderId,
      resultUrl: `${process.env.BETTER_AUTH_URL ?? 'https://app.ruta.cam'}/portal/booking/${token}?paid=1`,
      serverUrl: `${process.env.BETTER_AUTH_URL ?? 'https://app.ruta.cam'}/api/webhooks/liqpay`
    });
  }

  const nights = booking.roomLines[0]?.nightsCount ?? booking.paymentLines.length;

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Mobile-first: max-width 480px, центрований */}
      <div className='max-w-sm mx-auto px-4 py-8'>
        {/* Лого готелю */}
        <div className='text-center mb-6'>
          <h1 className='text-xl font-bold text-gray-900'>{booking.property.name}</h1>
          <p className='text-gray-500 text-sm mt-1'>Деталі бронювання</p>
        </div>

        {/* Картка бронювання */}
        <div className='bg-white rounded-2xl shadow-sm border p-5 space-y-4 mb-5'>
          <div>
            <p className='text-gray-500 text-xs uppercase tracking-wide'>Номер бронювання</p>
            <p className='font-bold text-lg'>{booking.bookingNumber}</p>
          </div>

          <hr />

          {/* Дати */}
          <div className='grid grid-cols-2 gap-4'>
            {booking.checkinDate && (
              <div>
                <p className='text-gray-500 text-xs'>Заїзд</p>
                <p className='font-semibold'>
                  {format(new Date(booking.checkinDate), 'dd MMM yyyy', { locale: uk })}
                </p>
              </div>
            )}
            {booking.checkoutDate && (
              <div>
                <p className='text-gray-500 text-xs'>Виїзд</p>
                <p className='font-semibold'>
                  {format(new Date(booking.checkoutDate), 'dd MMM yyyy', { locale: uk })}
                </p>
              </div>
            )}
          </div>

          {/* Номер і гості */}
          {booking.roomLines.length > 0 && (
            <div>
              <p className='text-gray-500 text-xs'>Номер</p>
              <p className='font-medium'>{booking.roomLines[0].roomCategory.name}</p>
              {booking.tariff && (
                <p className='text-gray-400 text-xs mt-0.5'>
                  {booking.tariff.name}
                  {booking.tariff.mealPlan && ` · ${booking.tariff.mealPlan}`}
                </p>
              )}
            </div>
          )}

          <div>
            <p className='text-gray-500 text-xs'>Гості</p>
            <p className='font-medium'>{booking.adultsCount} дорослих</p>
          </div>

          <hr />

          {/* Розбивка суми */}
          <div className='space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600'>Проживання</span>
              <span>{formatUAH(Number(booking.roomsTotal))}</span>
            </div>
            {Number(booking.discountTotal) > 0 && (
              <div className='flex justify-between text-sm text-green-600'>
                <span>Знижка</span>
                <span>- {formatUAH(Number(booking.discountTotal))}</span>
              </div>
            )}
            <hr />
            <div className='flex justify-between font-bold'>
              <span>Всього до оплати</span>
              <span>{formatUAH(Number(booking.grandTotal))}</span>
            </div>
            {Number(booking.paidAmount) > 0 && (
              <div className='flex justify-between text-sm text-gray-500'>
                <span>Вже сплачено</span>
                <span>{formatUAH(Number(booking.paidAmount))}</span>
              </div>
            )}
          </div>
        </div>

        {/* Графік оплат */}
        {booking.paymentLines.length > 0 && (
          <div className='bg-white rounded-2xl shadow-sm border p-5 mb-5'>
            <p className='font-semibold text-sm mb-3'>Графік оплат</p>
            <div className='space-y-2'>
              {booking.paymentLines.map((line) => (
                <div
                  key={line.id}
                  className='flex items-center justify-between py-2 border-b last:border-0'
                >
                  <div>
                    <p className='text-sm'>{line.label ?? `Платіж ${line.sequence}`}</p>
                    {line.dueDate && (
                      <p className='text-gray-400 text-xs'>
                        до {format(new Date(line.dueDate), 'dd.MM.yyyy', { locale: uk })}
                      </p>
                    )}
                  </div>
                  <div className='text-right'>
                    <p className='text-sm font-medium'>{formatUAH(Number(line.amount))}</p>
                    {line.status === 'paid' ? (
                      <span className='text-green-600 text-xs'>✓ Сплачено</span>
                    ) : (
                      <span className='text-orange-500 text-xs'>Очікується</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LiqPay форма */}
        {paymentAmount > 0 && (
          <div className='bg-white rounded-2xl shadow-sm border p-5'>
            <p className='font-semibold text-sm mb-1'>Оплата картою</p>
            <p className='text-gray-500 text-xs mb-4'>
              Сума до сплати:{' '}
              <span className='font-bold text-gray-900'>{formatUAH(paymentAmount)}</span>
            </p>

            {liqpayForm ? (
              <form
                method='POST'
                action='https://www.liqpay.ua/api/3/checkout'
                acceptCharset='utf-8'
              >
                <input type='hidden' name='data' value={liqpayForm.data} />
                <input type='hidden' name='signature' value={liqpayForm.signature} />
                <button
                  type='submit'
                  className='w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl text-base transition-colors'
                >
                  Сплатити {formatUAH(paymentAmount)} через LiqPay
                </button>
              </form>
            ) : (
              <div className='bg-gray-100 rounded-xl p-4 text-center text-gray-500 text-sm'>
                Оплата онлайн тимчасово недоступна.
                <br />
                Зверніться до менеджера.
              </div>
            )}
          </div>
        )}

        {/* Вже сплачено / підтвердження */}
        {paymentAmount <= 0 && (
          <div className='bg-green-50 border border-green-200 rounded-2xl p-5 text-center'>
            <p className='text-green-700 font-semibold text-lg'>✓ Оплату отримано</p>
            <p className='text-green-600 text-sm mt-1'>Бронювання підтверджено</p>
          </div>
        )}

        {/* Footer */}
        <p className='text-center text-gray-400 text-xs mt-8'>
          {booking.property.name}
          <br />
          При питаннях звертайтесь до менеджера
        </p>
      </div>
    </div>
  );
}

function formatUAH(amount: number): string {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0
  }).format(amount);
}
