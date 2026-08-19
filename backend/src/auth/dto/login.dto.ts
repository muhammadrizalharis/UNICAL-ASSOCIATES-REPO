import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  email!: string;

  @IsString()
  password!: string;

  /** Setara "Keep me logged in": memperpanjang masa berlaku token. */
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
