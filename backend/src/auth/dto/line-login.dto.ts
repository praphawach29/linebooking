import { IsNotEmpty, IsString } from 'class-validator';

export class LineLoginDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  redirectUri: string;
}
