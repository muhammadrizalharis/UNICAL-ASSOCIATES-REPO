import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * Langkah 2 registrasi: afiliasi. Seluruh field opsional karena pengguna
 * boleh melewati langkah ini, sebagaimana tombol "Skip this step".
 */
export class AffiliationDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  institution?: string;

  @IsOptional()
  @IsUUID()
  facultyId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  /** Dipakai bila fakultas tidak tersedia di daftar master. */
  @IsOptional()
  @IsString()
  @MaxLength(180)
  facultyOther?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  departmentOther?: string;
}
