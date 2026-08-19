import {
  IsBoolean,
  IsEmail,
  IsISO31661Alpha2,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Langkah 1 registrasi: identitas dasar dan kredensial. */
export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama depan wajib diisi' })
  @MaxLength(80)
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsISO31661Alpha2({ message: 'Kode negara harus 2 huruf, contoh: ID' })
  country?: string;

  @IsEmail({}, { message: 'Format email tidak valid' })
  @MaxLength(180)
  email!: string;

  @IsString()
  @MinLength(12, { message: 'Kata sandi minimal 12 karakter' })
  @MaxLength(128)
  password!: string;

  @IsBoolean()
  acceptTerms!: boolean;
}
