```ts
enum Channel {
  sms = 'sms',
  whatsApp = 'whatsApp',
}

interface Notification {
  // id da notificação no disparador
  id: string;

  // canal da notificação
  channel: Channel;

  // id do destinatário ex: +5511999999999
  to: string;

  // conteúdo da notificação
  body: string;

  // id definido pelos sistemas externos ao serviço de notificações
  externalId: string

  // other fields: recipients, timestamps, etc
}

export class NotificationSdk {
  // checks if a notification with the given externalId exists
  exists(externalId: string): Promise<boolean> {
    // mocked value, could return false
    return true;
  }
  
  // sends a notification
  send(channel: Channel, to: string, body: string, externalId: string): Promise<Notification> {
    // mocked charge
    const id = (Math.random() + 1).toString(36).substring(7);
    return { id, channel, to, body, externalId };
  }
}
```

Um serviço externo de disparo de notificações por SMS e WhatsApp fornece um método para disparo de notificações, mas não permite a consulta de notificações por API. Eles enviam as atualizações do status das notificações através de webhooks e, caso não consigam entregar o webhook, retentam a entrega por 1h após o evento. No entanto, disponibilizam um método para verificar se a notificação, dado seu id externo, foi enviada a eles.

Como não conseguimos consultar o status das notificações através da API, precisamos processar os webhooks e manter os registros atualizados em nosso banco de dados. 

As notificações de sms podem assumir os status processing, rejected, sent e delivered com as seguintes transições teóricas:
 - processing -> rejected
 - processing -> sent
 - sent -> delivered

As notificações de WhatsApp podem assumir os status processing, rejected, sent, delivered e viewed com as seguintes transições teóricas:
 - processing -> rejected
 - processing -> sent
 - sent -> delivered
 - delivered -> viewed

Os webhooks possuem o seguinte formato:
```json
{
  "timestamp": "YYYY-MM-DDThh:mm:ss.SSSZ",
  "event": "delivered" // or sent, etc
}
```

Em breve o sistema de notificações suportará novos canais com novos status e transições diferentes para cada canal.

Crie uma aplicação servida via Web API utilizando NodeJS/TypeScript que permita o envio, atualização e consulta dos status das notificações e disponibilize através de um repositório do GitHub. A escolha do banco de dados não é relevante para esse projeto, considere utilizar o SQLite por simplicidade.

1. Caso a nossa aplicação fique indisponível por muito tempo, podemos perder eventos de mudança de status. Quais medidas você tomaria para deixar a aplicação mais robusta?
  ```
  Para isso existem algumas possibilidades:
  
  1 - Disponibilizar a aplicação por meio do kubernetes que irá realizar o balanceamento automatico escalando horizontalmente e criando novas instancias da api caso ela venha a ser utilizada ou caso algum nó caia, e tendo mais de um nó disponível.

  2 - Criar um microserviço enxuto responsável apenas por receber o webhook e publicar a mensagem em um tópico do kafka, idealmente podemos disponibilizar várias instâncias dessa aplicação por meio do kubernetes.
  ```

2. Precisamos enviar os eventos de mudança de status das notificações para um stream de eventos (e.g. Apache Kafka, Amazon Kinesis Data Streams, etc) para que outras aplicações possam consumí-los. Precisamos garantir que cada evento seja entregue pelo menos uma vez no stream. Como você faria esse processo?
  ```
  Basta conectar ao kafka com um transaction e publicar a mensagem após receber o webhook. (lógica implementada)
  ```

3. Os eventos de mudança de estado podem vir eventualmente fora de ordem, caso o serviço externo de notificações demore para processar. Como você lidaria com isso?
  ```
  Como não guardamos o histórico do status e o que interessa é o status mais recente, podemos utilizar o campo updatedAt para comparar com o timestamp da notificação e verificar se ela é anterior ao ultimo pedido, garantindo sempre ficar com o status mais atualizado. (lógica implementada)
  ```
