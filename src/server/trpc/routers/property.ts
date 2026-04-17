import { router, authedProcedure } from '../trpc';
import { db } from '@/server/db';

export const propertyRouter = router({
  list: authedProcedure.query(async () => {
    return db.property.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        bookingPrefix: true
      },
      orderBy: { name: 'asc' }
    });
  })
});
