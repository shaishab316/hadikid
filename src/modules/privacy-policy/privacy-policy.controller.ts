import { Body, Controller, Get, Put } from '@nestjs/common';
import { PolicyId, PrivacyPolicyService } from './privacy-policy.service';
import { PrivacyPolicyUpdateDto } from './privacy-policy.dto';

@Controller('legal')
export class PrivacyPolicyController {
  constructor(private readonly privacyPolicyService: PrivacyPolicyService) {}

  // ──────────────────────────────────────────────
  // Privacy Policy
  // ──────────────────────────────────────────────

  @Get('privacy-policy')
  getPrivacyPolicy() {
    return this.privacyPolicyService.getPolicy(PolicyId.PRIVACY_POLICY);
  }

  @Put('privacy-policy')
  updatePrivacyPolicy(@Body() dto: PrivacyPolicyUpdateDto) {
    return this.privacyPolicyService.updatePolicy(
      PolicyId.PRIVACY_POLICY,
      dto.data,
    );
  }

  // ──────────────────────────────────────────────
  // Terms & Conditions
  // ──────────────────────────────────────────────

  @Get('term-and-condition')
  getTermAndCondition() {
    return this.privacyPolicyService.getPolicy(PolicyId.TERM_AND_CONDITION);
  }

  @Put('term-and-condition')
  updateTermAndCondition(@Body() dto: PrivacyPolicyUpdateDto) {
    return this.privacyPolicyService.updatePolicy(
      PolicyId.TERM_AND_CONDITION,
      dto.data,
    );
  }

  // ──────────────────────────────────────────────
  // Community Guidelines
  // ──────────────────────────────────────────────

  @Get('community-guidelines')
  getCommunityGuidelines() {
    return this.privacyPolicyService.getPolicy(PolicyId.COMMUNITY_GUIDELINES);
  }

  @Put('community-guidelines')
  updateCommunityGuidelines(@Body() dto: PrivacyPolicyUpdateDto) {
    return this.privacyPolicyService.updatePolicy(
      PolicyId.COMMUNITY_GUIDELINES,
      dto.data,
    );
  }
}
