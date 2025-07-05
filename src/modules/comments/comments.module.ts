import { Module, forwardRef } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { MongooseModule } from '@nestjs/mongoose';
import { COMMENTS_NAME, CommentSchema } from './comments.schema';
import { UsersModule } from '../users/users.module';
import { ProgramsModule } from '../programs/programs.module';
import { LibraryModule } from '../libraries/library.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: COMMENTS_NAME,
        schema: CommentSchema,
        collection: COMMENTS_NAME,
      },
    ]),
    UsersModule,
    forwardRef(() => ProgramsModule),
    forwardRef(() => LibraryModule),
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
