import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ResolveIdentifiersDto {
  /** Satu identifier per baris, atau kirim sebagai array. */
  @IsArray()
  @ArrayMaxSize(100, { message: 'Maksimal 100 identifier sekali kirim' })
  @IsString({ each: true })
  identifiers!: string[];
}

/** Jalur cadangan bila karya tidak memiliki identifier apa pun. */
export class ManualReferenceDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  title!: string;

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  authors!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  journal?: string;

  @IsOptional()
  @IsInt()
  @Min(1800)
  year?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  volume?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  issue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  pages?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  abstract?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsUrl()
  url?: string;
}
