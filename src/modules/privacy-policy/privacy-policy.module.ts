import { Module } from '@nestjs/common';
import { PrivacyPolicyService } from './privacy-policy.service';
import { PrivacyPolicyController } from './privacy-policy.controller';

@Module({
  providers: [PrivacyPolicyService],
  controllers: [PrivacyPolicyController],
})
export class PrivacyPolicyModule {}
