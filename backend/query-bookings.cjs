const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      ref_no: true,
      user_name: true,
      staff_name: true,
      court_name: true,
    }
  });
  console.log(JSON.stringify(bookings, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
