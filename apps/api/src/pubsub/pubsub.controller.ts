import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  BadRequestException,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PubSubService } from '@emulator-studio/pubsub';
import { validateResourceName } from '@emulator-studio/shared';
import { assertValidName } from '../common/domain-exception.filter';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CreateTopicDto } from './dto/create-topic.dto';
import { PublishMessageDto } from './dto/publish-message.dto';
import { PullMessagesDto } from './dto/pull-messages.dto';

@ApiTags('Pub/Sub')
@Controller('api/pubsub')
export class PubSubController {
  constructor(@Inject(PubSubService) private readonly pubsubService: PubSubService) {}

  @Get('status')
  @ApiOkResponse({ description: 'Connection status and resource lists' })
  getStatus() {
    return this.pubsubService.getConnectionStatus();
  }

  @Post('topics')
  @ApiCreatedResponse({ description: 'Topic created' })
  async createTopic(@Body() body: CreateTopicDto) {
    const topicName = body.name.trim();
    assertValidName(validateResourceName(topicName, 'topic name'));
    await this.pubsubService.createTopic(topicName);
    return { name: topicName };
  }

  @Delete('topics/:name')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Topic deleted' })
  async deleteTopic(@Param('name') name: string) {
    const topicName = name.trim();
    assertValidName(validateResourceName(topicName, 'topic name'));
    await this.pubsubService.deleteTopic(topicName);
  }

  @Post('subscriptions')
  @ApiCreatedResponse({ description: 'Subscription created' })
  async createSubscription(@Body() body: CreateSubscriptionDto) {
    const topicName = body.topicName.trim();
    const subscriptionName = body.name.trim();

    assertValidName(validateResourceName(topicName, 'topic name'));
    assertValidName(validateResourceName(subscriptionName, 'subscription name'));

    await this.pubsubService.createSubscription(topicName, subscriptionName);
    return { name: subscriptionName, topic: topicName };
  }

  @Delete('subscriptions/:name')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Subscription deleted' })
  async deleteSubscription(@Param('name') name: string) {
    const subscriptionName = name.trim();
    assertValidName(validateResourceName(subscriptionName, 'subscription name'));
    await this.pubsubService.deleteSubscription(subscriptionName);
  }

  @Post('publish')
  @ApiCreatedResponse({ description: 'Message published' })
  async publish(@Body() body: PublishMessageDto) {
    const topic = body.topic.trim();
    const message = body.message;

    if (!topic) throw new BadRequestException({ error: 'Topic is required.' });
    if (!message) throw new BadRequestException({ error: 'Message is required.' });

    return this.pubsubService.publishMessage(topic, message);
  }

  @Post('subscriptions/:name/pull')
  @ApiOkResponse({ description: 'Messages pulled from subscription' })
  async pull(@Param('name') name: string, @Body() body: PullMessagesDto) {
    const subscriptionName = name.trim();
    assertValidName(validateResourceName(subscriptionName, 'subscription name'));
    return this.pubsubService.pullMessages(
      subscriptionName,
      body.maxMessages ?? 5,
      body.ack ?? true
    );
  }
}
