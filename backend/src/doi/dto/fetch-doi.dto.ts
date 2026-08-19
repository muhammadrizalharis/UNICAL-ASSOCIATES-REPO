import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class FetchDoiDto {
  @IsString()
  @IsNotEmpty({ message: 'DOI wajib diisi' })
  @MaxLength(255)
  doi!: string;
}
