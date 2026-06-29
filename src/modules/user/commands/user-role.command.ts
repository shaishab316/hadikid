import { Command, Positional } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { UserRole } from '../user.constant';

const ROLES = Object.values(UserRole);

@Injectable()
export class UserRoleCommand {
  constructor(private readonly userRepository: UserRepository) {}

  @Command({
    command: 'role:upgrade <userId> <role>',
    describe: `Assign a role to a user. Available roles: ${ROLES.join(', ')}`,
  })
  async upgrade(
    @Positional({ name: 'userId', describe: 'Target user ID', type: 'number' })
    userId: number,

    @Positional({
      name: 'role',
      describe: 'Role to assign',
      type: 'string',
      choices: ROLES,
    })
    role: UserRole,
  ) {
    await this.userRepository.updateRoleViaAdmin(userId, role);
    console.log(`✅ Role [${role}] assigned to user #${userId}`);
  }

  @Command({
    command: 'role:downgrade <userId> <role>',
    describe: `Remove a role from a user. Available roles: ${ROLES.join(', ')}`,
  })
  async downgrade(
    @Positional({ name: 'userId', describe: 'Target user ID', type: 'number' })
    userId: number,

    @Positional({
      name: 'role',
      describe: 'Role to remove',
      type: 'string',
      choices: ROLES,
    })
    role: UserRole,
  ) {
    const result = await this.userRepository.downgradeRoleViaAdmin(
      userId,
      role,
    );

    if (!result) {
      console.warn(`⚠️  User #${userId} did not have role [${role}]`);
    } else {
      console.log(`✅ Role [${role}] removed from user #${userId}`);
    }
  }
}
