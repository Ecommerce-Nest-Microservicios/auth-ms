import { Inject, Injectable } from '@nestjs/common';
import { RegisterUserDto } from './dto/register-auth.dto';
import { LoginUserDto } from './dto/login-auth.dto';
import { VerifyUserDto } from './dto/verify-auth.dto';
import { PrismaService } from 'src/database/prisma.service';
import { NATS_SERVICE } from 'src/config/microservices';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import {
  catchError,
  firstValueFrom,
  from,
  lastValueFrom,
  map,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';
import {
  IAuthData,
  IAuthServiceResponse,
  JWTPayload,
} from './interfaces/auth.interface';
import { hashSync, compareSync, genSaltSync } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import config from 'src/config/config';
import { ConfigType } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
    @Inject(config.KEY)
    private readonly configService: ConfigType<typeof config>,
  ) {}

  register(registerUserDto: RegisterUserDto): Observable<IAuthServiceResponse> {
    const { name, email, password } = registerUserDto;
    return from(
      this.prisma.user.findUnique({
        where: {
          email,
        },
      }),
    ).pipe(
      switchMap((userFound) => {
        if (userFound) {
          throw new RpcException({
            message: 'User already exists',
            error: 'Bad Request',
            code: 400,
          });
        } else {
          return from(
            this.prisma.user.create({
              data: {
                email,
                name,
                password: hashSync(password, genSaltSync(10)),
              },
              select: {
                id: true,
                name: true,
                email: true,
              },
            }),
          ).pipe(
            switchMap((userCreated) => {
              return this.signJWT(userCreated).pipe(
                map((token) => {
                  return {
                    ok: true,
                    message: 'User created!',
                    data: {
                      user: userCreated,
                      token,
                    },
                  };
                }),
              );
            }),
            catchError((error) => {
              throw error instanceof RpcException
                ? error
                : new RpcException({
                    message: error.message || 'Unexpected error occurred',
                    error: error.code || 'Internal Server Error',
                    code: 500,
                  });
            }),
          );
        }
      }),
      catchError((error) => {
        throw error instanceof RpcException
          ? error
          : new RpcException({
              message: error.message || 'Unexpected error occurred',
              error: error.code || 'Internal Server Error',
              code: 500,
            });
      }),
    );
  }

  login(loginUserDto: LoginUserDto): Observable<IAuthServiceResponse> {
    const { email, password } = loginUserDto;
    return from(
      this.prisma.user.findUnique({
        where: {
          email,
        },
      }),
    ).pipe(
      switchMap((userFound) => {
        if (!userFound) {
          throw new RpcException({
            message: 'Invalid credentials',
            error: 'Bad Request',
            code: 400,
          });
        } else {
          if (!compareSync(password, userFound.password)) {
            throw new RpcException({
              message: 'Invalid credentials',
              error: 'Bad Request',
              code: 400,
            });
          } else {
            const { password: _, ...rest } = userFound;

            return this.signJWT(rest).pipe(
              map((token) => {
                return {
                  ok: true,
                  message: 'User auth successfully!',
                  data: {
                    user: rest,
                    token,
                  },
                };
              }),
            );
          }
        }
      }),
      catchError((error) => {
        throw error instanceof RpcException
          ? error
          : new RpcException({
              message: error.message || 'Unexpected error occurred',
              error: error.code || 'Internal Server Error',
              code: 500,
            });
      }),
    );
  }

  signJWT(payload: JWTPayload) {
    return from(
      this.jwtService.signAsync(payload, {
        secret: this.configService.JWT_SECRET,
      }),
    ).pipe(
      catchError((error) => {
        throw error instanceof RpcException
          ? error
          : new RpcException({
              message: error.message || 'Unexpected error occurred',
              error: error.code || 'Internal Server Error',
              code: error.code || 500,
            });
      }),
    );
  }

  verifyToken(payload: IAuthData) {
    return from(
      this.jwtService.verifyAsync(payload.token, {
        secret: this.configService.JWT_SECRET,
      }),
    ).pipe(
      switchMap(({ sub, iat, exp, ...user }) => {
        return this.signJWT(user).pipe(
          map((token) => ({
            user,
            token,
          })),
        );
      }),
      catchError((error) => {
        throw error instanceof RpcException
          ? error
          : new RpcException({
              message: error.message || 'Unexpected error occurred',
              error: error.code || 'Internal Server Error',
              code: error.code || 500,
            });
      }),
    );
  }
}
