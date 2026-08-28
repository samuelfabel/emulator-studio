import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { StorageService } from '@emulator-studio/storage';
import { validateBucketName } from '@emulator-studio/shared';
import type { Response } from 'express';
import { CreateBucketDto } from './dto/create-bucket.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateObjectDto } from './dto/update-object.dto';
import { UploadObjectDto } from './dto/upload-object.dto';

@ApiTags('Cloud Storage')
@Controller('api/storage')
export class StorageController {
  constructor(@Inject(StorageService) private readonly storageService: StorageService) {}

  @Get('status')
  @ApiOkResponse({ description: 'Connection status and bucket list' })
  getStatus() {
    return this.storageService.getConnectionStatus();
  }

  @Post('buckets')
  @ApiOkResponse({ description: 'Bucket created' })
  async createBucket(@Body() body: CreateBucketDto) {
    const name = body.name.trim();
    const err = validateBucketName(name);
    if (err) throw new BadRequestException({ error: err });
    return this.storageService.createBucket(name);
  }

  @Get('buckets/:bucket')
  @ApiOkResponse({ description: 'Bucket metadata' })
  getBucket(@Param('bucket') bucket: string) {
    return this.storageService.getBucket(bucket.trim());
  }

  @Delete('buckets/:bucket')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Bucket deleted' })
  async deleteBucket(
    @Param('bucket') bucket: string,
    @Query('force') force?: string
  ) {
    await this.storageService.deleteBucket(bucket.trim(), force === 'true' || force === '1');
  }

  @Get('buckets/:bucket/iam')
  @ApiOkResponse({ description: 'Bucket IAM policy (if emulator supports it)' })
  getBucketIam(@Param('bucket') bucket: string) {
    return this.storageService.getBucketIam(bucket.trim());
  }

  @Get('buckets/:bucket/objects')
  @ApiOkResponse({ description: 'List objects and folders under prefix' })
  listObjects(@Param('bucket') bucket: string, @Query('prefix') prefix?: string) {
    return this.storageService.listObjects(bucket.trim(), prefix ?? '');
  }

  @Get('buckets/:bucket/objects/meta')
  @ApiOkResponse({ description: 'Object metadata' })
  getObject(@Param('bucket') bucket: string, @Query('name') name?: string) {
    if (!name?.trim()) throw new BadRequestException({ error: 'Query "name" is required.' });
    return this.storageService.getObject(bucket.trim(), name.trim());
  }

  @Patch('buckets/:bucket/objects')
  @ApiOkResponse({ description: 'Object metadata updated (optional rename)' })
  updateObject(
    @Param('bucket') bucket: string,
    @Query('name') name: string | undefined,
    @Body() body: UpdateObjectDto
  ) {
    if (!name?.trim()) throw new BadRequestException({ error: 'Query "name" is required.' });
    return this.storageService.updateObject(bucket.trim(), name.trim(), {
      newName: body.newName,
      contentType: body.contentType,
      contentEncoding: body.contentEncoding,
      metadata: body.metadata,
    });
  }

  @Get('buckets/:bucket/objects/download')
  @ApiOkResponse({ description: 'Download object bytes' })
  async download(
    @Param('bucket') bucket: string,
    @Query('name') name: string | undefined,
    @Res() res: Response
  ) {
    if (!name?.trim()) throw new BadRequestException({ error: 'Query "name" is required.' });
    const data = await this.storageService.downloadObject(bucket.trim(), name.trim());
    const fileName = name.split('/').pop() || 'download';
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(data);
  }

  @Post('buckets/:bucket/objects')
  @ApiOkResponse({ description: 'Object uploaded' })
  async upload(@Param('bucket') bucket: string, @Body() body: UploadObjectDto) {
    const objectName = body.name.trim();
    if (!objectName) throw new BadRequestException({ error: 'Object name is required.' });

    const encoding = body.encoding ?? 'utf8';
    const data =
      encoding === 'base64' ? Buffer.from(body.content, 'base64') : Buffer.from(body.content, 'utf8');

    return this.storageService.uploadObject(
      bucket.trim(),
      objectName,
      data,
      body.contentType
    );
  }

  @Post('buckets/:bucket/folders')
  @ApiOkResponse({ description: 'Folder placeholder created' })
  async createFolder(@Param('bucket') bucket: string, @Body() body: CreateFolderDto) {
    const path = body.path.trim();
    if (!path) throw new BadRequestException({ error: 'Folder path is required.' });
    return this.storageService.createFolder(bucket.trim(), path);
  }

  @Delete('buckets/:bucket/objects')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Object deleted' })
  async deleteObject(@Param('bucket') bucket: string, @Query('name') name?: string) {
    if (!name?.trim()) throw new BadRequestException({ error: 'Query "name" is required.' });
    await this.storageService.deleteObject(bucket.trim(), name.trim());
  }
}
