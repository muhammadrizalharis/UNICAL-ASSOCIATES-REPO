import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePublicationDto {
  @IsString()
  doi!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  indexationCodes?: string[];

  /** Urutan penulis yang diklaim sebagai diri sendiri, dimulai dari 1. */
  @IsOptional()
  @IsInt()
  @Min(1)
  claimAuthorOrder?: number;

  @IsOptional()
  @IsString()
  abstractOverride?: string;
}
