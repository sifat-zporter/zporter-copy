import { IsArray, IsBoolean, IsNumber, IsString, Min } from 'class-validator';

export class CreateDriveDto {
  /**
   * URI to access the uploaded file (e.g., Firebase Storage URL).
   */
  @IsString()
  fileUri: string;

  /**
   * Size of the file in bytes.
   */
  @IsNumber()
  @Min(0)
  filesize: number;

  /**
   * summary or description of the file.
   */
  @IsString()
  summary: string;

  /**
   * tags associated with the file (e.g., categories, keywords).
   */
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  /**
   * Indicates whether the file is shared with the Zai system.
   */
  @IsBoolean()
  sharedWithZai: boolean;

  /**
   * list of user IDs the file is explicitly shared with.
   */
  @IsString()
  sharedWith: string;
}
