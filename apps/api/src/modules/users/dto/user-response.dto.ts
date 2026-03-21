/**
 * The public representation of a user.
 * passwordHash and refreshTokenHash are intentionally excluded — they must
 * never leave the API boundary under any circumstances.
 */
export class UserResponseDto {
  id: string;
  email: string;

  constructor(partial: { id: string; email: string }) {
    this.id = partial.id;
    this.email = partial.email;
  }
}
