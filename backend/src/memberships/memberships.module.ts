import { Module } from '@nestjs/common';
import { MembershipsController } from './memberships.controller';
import { CustomerMembershipsController } from './customer-memberships.controller';
import { MembershipsService } from './memberships.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MembershipsController, CustomerMembershipsController],
  providers: [MembershipsService],
  exports: [MembershipsService]
})
export class MembershipsModule {}
