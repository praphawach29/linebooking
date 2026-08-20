import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, NotEquals } from 'class-validator';

export class AdjustPointsDto {
  @IsUUID('4')
  @IsNotEmpty()
  targetUserId: string;

  @IsInt()
  @NotEquals(0)
  pointsDelta: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
