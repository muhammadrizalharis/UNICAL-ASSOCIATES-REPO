import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(12, { message: 'Kata sandi baru minimal 12 karakter' })
  @MaxLength(128)
  newPassword!: string;
}
