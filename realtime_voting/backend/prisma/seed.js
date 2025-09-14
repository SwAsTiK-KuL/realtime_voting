import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const user1 = await prisma.user.create({
      data: {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        passwordHash: hashedPassword,
      },
    });

    const user2 = await prisma.user.create({
      data: {
        name: 'Bob Smith',
        email: 'bob@example.com',
        passwordHash: hashedPassword,
      },
    });

    const user3 = await prisma.user.create({
      data: {
        name: 'Carol Davis',
        email: 'carol@example.com',
        passwordHash: hashedPassword,
      },
    });

    console.log('✅ Created sample users');

    const poll1 = await prisma.poll.create({
      data: {
        question: 'What is your favorite programming language?',
        isPublished: true,
        creatorId: user1.id,
        options: {
          create: [
            { text: 'JavaScript' },
            { text: 'Python' },
            { text: 'Java' },
            { text: 'Go' },
            { text: 'Rust' },
          ],
        },
      },
      include: {
        options: true,
      },
    });

    const poll2 = await prisma.poll.create({
      data: {
        question: 'Which framework do you prefer for web development?',
        isPublished: true,
        creatorId: user2.id,
        options: {
          create: [
            { text: 'React' },
            { text: 'Vue.js' },
            { text: 'Angular' },
            { text: 'Svelte' },
          ],
        },
      },
      include: {
        options: true,
      },
    });

    const poll3 = await prisma.poll.create({
      data: {
        question: 'What is the best approach for backend development?',
        isPublished: false, 
        creatorId: user3.id,
        options: {
          create: [
            { text: 'Microservices' },
            { text: 'Monolithic' },
            { text: 'Serverless' },
            { text: 'Hybrid' },
          ],
        },
      },
      include: {
        options: true,
      },
    });

    const poll4 = await prisma.poll.create({
      data: {
        question: 'What is your preferred database type?',
        isPublished: true,
        creatorId: user1.id,
        options: {
          create: [
            { text: 'PostgreSQL' },
            { text: 'MySQL' },
            { text: 'MongoDB' },
            { text: 'Redis' },
            { text: 'SQLite' },
          ],
        },
      },
      include: {
        options: true,
      },
    });

    console.log('✅ Created sample polls');

    await prisma.vote.createMany({
      data: [
        { userId: user2.id, pollOptionId: poll1.options[0].id }, 
        { userId: user3.id, pollOptionId: poll1.options[1].id }, 
        { userId: user1.id, pollOptionId: poll1.options[0].id }, 
      ],
    });

    await prisma.vote.createMany({
      data: [
        { userId: user1.id, pollOptionId: poll2.options[0].id }, 
        { userId: user3.id, pollOptionId: poll2.options[0].id }, 
        { userId: user2.id, pollOptionId: poll2.options[1].id }, 
      ],
    });

    await prisma.vote.createMany({
      data: [
        { userId: user2.id, pollOptionId: poll4.options[0].id }, 
        { userId: user3.id, pollOptionId: poll4.options[0].id }, 
        { userId: user1.id, pollOptionId: poll4.options[2].id }, 
      ],
    });

    console.log('✅ Created sample votes');

    const userCount = await prisma.user.count();
    const pollCount = await prisma.poll.count();
    const optionCount = await prisma.pollOption.count();
    const voteCount = await prisma.vote.count();

    console.log('\n Database seeded successfully!');
    console.log(`   Users: ${userCount}`);
    console.log(`   Polls: ${pollCount}`);
    console.log(`   Poll Options: ${optionCount}`);
    console.log(`   Votes: ${voteCount}`);

    console.log('\n Sample login credentials:');
    console.log('   Email: alice@example.com | Password: password123');
    console.log('   Email: bob@example.com   | Password: password123');
    console.log('   Email: carol@example.com | Password: password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });