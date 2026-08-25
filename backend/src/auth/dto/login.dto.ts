import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  email!: string;

  @IsString()
  password!: string;

  /** Setara "Keep me logged in": memperpanjang masa berlaku token. */
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  /**
   * Segmen URL pintu masuk, diisi otomatis oleh halaman /welcome/[gate].
   * Anggota biasa mengosongkannya.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  gate?: string;

  /** Kode 6 digit dari aplikasi autentikator; wajib bila 2FA aktif. */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  totpCode?: string;
}
