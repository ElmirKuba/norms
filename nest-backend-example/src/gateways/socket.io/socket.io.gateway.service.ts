import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { DefaultEventsMap, Server, Socket } from 'socket.io';
import { ValidateTokensManagerService } from '../../managers-level/tokens/validate-tokens/validate-tokens.manager.service';

/** Порт, который занимает REST-API */
const port = process.env.BACKEND_PORT_WEBSOCKET ?? 3001;

/** Gateway сервис обрабатывающий всю работу с WebSocket (Socket.IO) */
@WebSocketGateway(Number(port), {
  cors: {
    origin: '*',
    credentials: true,
  },
  cookie: true,
  namespace: 'socket-io-nest-backend',
})
export class SocketIOGatewayService
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  /** Массив всех клиентов подключенных к нашему WebSocket серверу */
  allClients: Socket[] = [];

  /** Экземпляр текущего WebSocket сервера */
  @WebSocketServer() server: Server;

  /**
   * Конструктор GateWay сервиса
   * @param {ValidateTokensManagerService} validateTokensManagerService — Экземпляр сервиса модуля валидации JWT токенов
   */
  constructor(
    private readonly validateTokensManagerService: ValidateTokensManagerService,
  ) {}

  afterInit(server: Server) {
    this.server = server;
  }

  /**
   * Событие вызываемое при подключении WebSocket клиента
   * @param {Socket} client - Объект клиента который подключается
   * @returns {void} - Метод ничего не возвращает
   * @public
   */
  public handleConnection(
    @ConnectedSocket() client: Socket,
    ...args: any[]
  ): void {
    /** Получаем все заголовки */
    const headers = client.handshake?.headers || {};

    /** Токен доступа из заголовков WS */
    const accessToken = headers['accesstoken'] as string;

    const resultValidateAccessToken =
      this.validateTokensManagerService.validateAnyToken(
        accessToken,
        'accessToken',
      );

    if (resultValidateAccessToken.error) {
      client.emit('error', { message: 'UNAUTHORIZED' });
      client.disconnect(true);
      return;
    }

    if (!this.getClientByClientObject(client)) {
      this.addClient(client);
    }
  }

  /**
   * Событие вызываемое при отключении WebSocket клиента.
   * Гарантированно удаляет клиента из массива даже если внутренние операции
   * выбросили исключение — иначе массив `allClients` мог бы расти бесконечно.
   * @param {Socket} client - Объект клиента который отключается
   * @returns {void} - Метод ничего не возвращает
   * @public
   */
  public handleDisconnect(@ConnectedSocket() client: Socket): void {
    try {
      if (this.getClientByClientObject(client)) {
        client.disconnect(true);
      }
    } finally {
      this.removeClient(client);
    }
  }

  /**
   * Добавить клиента в массив клиентов по полному объекту клиента
   * @param {Socket} client - Полный объект клиента, который будет добавлен в массив клиентов
   * @returns {Socket[]} - Новый массив клиентов, куда был добавлен новый клиент (с учетом нового клиента)
   * @public
   */
  public addClient(client: Socket): Socket[] {
    this.allClients.push(client);

    return this.allClients;
  }

  /**
   * Удалить клиента если он был в массиве клиентов по полному объекту клиента
   * @param {Socket} clientApplicantVerification - Объект клиента которого мы удалим
   * @returns {Socket[]} - Функция вернет мутированный массив клиентов без клиента который был удален
   * @public
   */
  public removeClient(clientApplicantDeletion: Socket): Socket[] {
    this.allClients = this.allClients.filter((clientItem: Socket) => {
      if (clientItem.id === clientApplicantDeletion.id) {
        return false;
      } else {
        return true;
      }
    });

    return this.allClients;
  }

  /**
   * Получить клиента если он есть в массиве клиентов по полному объекту клиента
   * @param {Socket} clientApplicantVerification - Объект клиента которого мы ищем
   * @returns {Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> | undefined} - Объект найденного
   * @public
   */
  public getClientByClientObject(
    clientApplicantVerification: Socket,
  ):
    | Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
    | undefined {
    const findedClient = this.allClients.find((clientItem: Socket) => {
      if (clientItem.id !== clientApplicantVerification.id) {
        return false;
      } else {
        return true;
      }
    });

    return findedClient;
  }
}
