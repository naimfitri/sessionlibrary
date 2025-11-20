import { Test, TestingModule } from '@nestjs/testing';
import { SessionSnifferService } from './session-sniffer.service';

describe('SessionSnifferService', () => {
  let service: SessionSnifferService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionSnifferService],
    }).compile();

    service = module.get<SessionSnifferService>(SessionSnifferService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
